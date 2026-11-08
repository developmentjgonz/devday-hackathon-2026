/**
 * Server-side authentication helpers for the Cloudflare Worker.
 *
 * This module deliberately does not expose a public registration flow and does
 * not contain seed credentials. Route handlers must apply their own login rate
 * limiting before calling loginWithPassword.
 */

const encoder = new TextEncoder();
const PBKDF2_ITERATIONS = 600_000;
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 256;
const EMAIL_MAX_LENGTH = 254;
const DEMO_CODE_PREFIX = "mews-demo-code-v1";
const DEMO_CODE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export const AUTH_COOKIE = "mews_session";
export const CSRF_COOKIE = "mews_csrf";
export const AUTH_ROLES = ["admin", "coordinator", "volunteer", "sponsor"];

function nowSeconds() { return Math.floor(Date.now() / 1000); }
function randomBytes(length) { const bytes = new Uint8Array(length); crypto.getRandomValues(bytes); return bytes; }
function bytesToBase64Url(bytes) { let text = ""; for (const byte of bytes) text += String.fromCharCode(byte); return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
function base64UrlToBytes(value) { const base64 = String(value).replace(/-/g, "+").replace(/_/g, "/"); const padded = base64 + "=".repeat((4 - base64.length % 4) % 4); const raw = atob(padded); return Uint8Array.from(raw, (character) => character.charCodeAt(0)); }
function constantTimeEqual(left, right) { if (!(left instanceof Uint8Array) || !(right instanceof Uint8Array) || left.length !== right.length) return false; let difference = 0; for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index]; return difference === 0; }
async function sha256(value) { return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)))); }
/** Bounded, D1-backed rate limit. Use Cloudflare's trusted connecting IP only. */
export async function allowLoginAttempt(env, request, email) {
  const ip = request.headers.get("CF-Connecting-IP");
  if (!env?.DB || !ip) return false;
  const timestamp = nowSeconds();
  const keys = [await sha256(`ip:${ip}`), await sha256(`account:${normalizeEmail(email) ?? "invalid"}`)];
  const statements = keys.map((key) => env.DB.prepare("INSERT INTO login_rate_limits (key_hash, window_start, attempts) VALUES (?, ?, 1) ON CONFLICT(key_hash) DO UPDATE SET window_start = CASE WHEN window_start <= ? THEN excluded.window_start ELSE window_start END, attempts = CASE WHEN window_start <= ? THEN 1 ELSE attempts + 1 END RETURNING attempts").bind(key, timestamp, timestamp - 900, timestamp - 900));
  const results = await env.DB.batch(statements);
  return results.every((result) => Number(result.results?.[0]?.attempts ?? 99) <= 10);
}
function cookieOptions({ maxAge = SESSION_TTL_SECONDS, httpOnly = true } = {}) { return `Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure${httpOnly ? "; HttpOnly" : ""}`; }
function appendCookie(headers, name, value, options) { headers.append("Set-Cookie", `${name}=${value}; ${options}`); }
function parseCookies(request) { const raw = request.headers.get("Cookie") ?? ""; return raw.split(";").reduce((cookies, part) => { const index = part.indexOf("="); if (index > 0) cookies[part.slice(0, index).trim()] = part.slice(index + 1).trim(); return cookies; }, {}); }
function authError(status, error) { return { ok: false, response: Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } }) }; }

export function normalizeEmail(value) {
  const email = String(value ?? "").trim().toLowerCase();
  if (!email || email.length > EMAIL_MAX_LENGTH || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function isValidRole(role) { return AUTH_ROLES.includes(role); }

export async function hashPassword(password) {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) throw new Error(`Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters.`);
  const salt = randomBytes(16);
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS }, key, 256);
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password, encodedHash) {
  if (typeof password !== "string" || typeof encodedHash !== "string") return false;
  const [algorithm, iterationsText, saltText, digestText] = encodedHash.split("$");
  const iterations = Number(iterationsText);
  if (algorithm !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations < 310_000 || iterations > 2_000_000 || !saltText || !digestText) return false;
  try {
    const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: base64UrlToBytes(saltText), iterations }, key, 256);
    return constantTimeEqual(new Uint8Array(bits), base64UrlToBytes(digestText));
  } catch { return false; }
}

/** Hosted synthetic-demo access only. The trusted setup must generate each code
 * from 32 random bytes; this is not a password KDF or a public registration API.
 * Cloudflare caps native PBKDF2 below our existing password cost. Keep those
 * password hashes intact and use separate high-entropy, salted access codes. */
export async function hashDemoAccessCode(code) {
  if (typeof code !== "string" || !DEMO_CODE_PATTERN.test(code)) throw new Error("Hosted demo codes must be 43 base64url characters generated from 32 random bytes.");
  const salt = bytesToBase64Url(randomBytes(16));
  const digest = await sha256(`${DEMO_CODE_PREFIX}:${salt}:${code}`);
  return `${DEMO_CODE_PREFIX}$${salt}$${digest}`;
}

export async function verifyDemoAccessCode(code, encodedHash, env) {
  if (env?.SYNTHETIC_HOSTED_DEMO !== "true" || typeof code !== "string" || !DEMO_CODE_PATTERN.test(code) || typeof encodedHash !== "string") return false;
  const [prefix, salt, digest, extra] = encodedHash.split("$");
  if (prefix !== DEMO_CODE_PREFIX || extra !== undefined || !/^[A-Za-z0-9_-]{22}$/.test(salt ?? "") || !/^[A-Za-z0-9_-]{43}$/.test(digest ?? "")) return false;
  try {
    const expected = base64UrlToBytes(digest);
    if (base64UrlToBytes(salt).length !== 16 || expected.length !== 32) return false;
    const actual = base64UrlToBytes(await sha256(`${DEMO_CODE_PREFIX}:${salt}:${code}`));
    return constantTimeEqual(actual, expected);
  } catch { return false; }
}

/** Use only from a protected admin/setup workflow; do not attach this to public registration. */
export async function provisionUser(env, { email, password, role }) {
  if (!env?.DB) throw new Error("Database binding is required.");
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !isValidRole(role)) throw new Error("Invalid user details.");
  const passwordHash = await hashPassword(password);
  const createdAt = nowSeconds();
  try {
    const result = await env.DB.prepare("INSERT INTO users (email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").bind(normalizedEmail, passwordHash, role, createdAt, createdAt).run();
    return { id: Number(result.meta?.last_row_id), email: normalizedEmail, role };
  } catch (error) {
    if (String(error?.message ?? "").toLowerCase().includes("unique")) throw new Error("User already exists.");
    throw new Error("Unable to provision user.");
  }
}

export async function loginWithPassword(env, request, { email, password }) {
  if (!requireSameOrigin(request, env)) return null;
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || typeof password !== "string") return null;
  const user = await env.DB.prepare("SELECT id, email, password_hash, role FROM users WHERE email = ? AND disabled_at IS NULL LIMIT 1").bind(normalizedEmail).first();
  // Do the same expensive work with an inert valid-format hash when no user exists to reduce enumeration timing.
  const inertHash = "pbkdf2-sha256$310000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const hash = user?.password_hash ?? inertHash;
  const valid = hash.startsWith(`${DEMO_CODE_PREFIX}$`)
    ? await verifyDemoAccessCode(password, hash, env)
    : await verifyPassword(password, hash);
  if (!valid) return null;
  if (!user || !isValidRole(user.role)) return null;
  return createSession(env, Number(user.id), { id: Number(user.id), email: user.email, role: user.role });
}

export async function createSession(env, userId, user) {
  if (!env?.DB || !Number.isInteger(userId) || !user || !isValidRole(user.role)) throw new Error("Invalid session details.");
  const token = bytesToBase64Url(randomBytes(32));
  const csrfToken = bytesToBase64Url(randomBytes(32));
  const createdAt = nowSeconds();
  const expiresAt = createdAt + SESSION_TTL_SECONDS;
  await env.DB.prepare("INSERT INTO user_sessions (user_id, token_hash, csrf_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)").bind(userId, await sha256(token), await sha256(csrfToken), createdAt, expiresAt).run();
  return { user, token, csrfToken, expiresAt };
}

export function sessionHeaders(session) {
  const headers = new Headers({ "Cache-Control": "no-store", Vary: "Cookie" });
  appendCookie(headers, AUTH_COOKIE, session.token, cookieOptions());
  appendCookie(headers, CSRF_COOKIE, session.csrfToken, cookieOptions({ httpOnly: false }));
  return headers;
}

export function clearSessionHeaders() {
  const headers = new Headers({ "Cache-Control": "no-store", Vary: "Cookie" });
  appendCookie(headers, AUTH_COOKIE, "", cookieOptions({ maxAge: 0 }));
  appendCookie(headers, CSRF_COOKIE, "", cookieOptions({ maxAge: 0, httpOnly: false }));
  return headers;
}

export async function getSession(request, env) {
  if (!env?.DB) return null;
  const token = parseCookies(request)[AUTH_COOKIE];
  if (!token || token.length > 128) return null;
  const session = await env.DB.prepare("SELECT s.id AS session_id, s.user_id, s.csrf_hash, s.expires_at, u.email, u.role FROM user_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ? AND u.disabled_at IS NULL LIMIT 1").bind(await sha256(token), nowSeconds()).first();
  if (!session || !isValidRole(session.role)) return null;
  return { id: Number(session.session_id), userId: Number(session.user_id), csrfHash: session.csrf_hash, expiresAt: Number(session.expires_at), user: { id: Number(session.user_id), email: session.email, role: session.role } };
}

/** Require an explicit configured origin. Fails closed if APP_ORIGIN is absent or mismatched. */
export function requireSameOrigin(request, env) {
  const expectedOrigin = env?.APP_ORIGIN;
  const origin = request.headers.get("Origin");
  return typeof expectedOrigin === "string" && expectedOrigin.length > 0 && origin === expectedOrigin;
}

export async function verifyCsrf(request, env, session) {
  if (!requireSameOrigin(request, env) || !session?.csrfHash) return false;
  const cookies = parseCookies(request);
  const headerToken = request.headers.get("X-CSRF-Token");
  if (!headerToken || !cookies[CSRF_COOKIE] || headerToken.length > 128 || cookies[CSRF_COOKIE].length > 128) return false;
  const headerHash = await sha256(headerToken);
  const cookieHash = await sha256(cookies[CSRF_COOKIE]);
  return constantTimeEqual(encoder.encode(headerHash), encoder.encode(cookieHash)) && constantTimeEqual(encoder.encode(headerHash), encoder.encode(session.csrfHash));
}

export async function requireRole(request, env, allowedRoles, { csrf = false } = {}) {
  const session = await getSession(request, env);
  if (!session) return authError(401, "Authentication required.");
  if (!Array.isArray(allowedRoles) || !allowedRoles.includes(session.user.role)) return authError(403, "Insufficient role.");
  if (csrf && !await verifyCsrf(request, env, session)) return authError(403, "CSRF validation failed.");
  return { ok: true, session };
}

export async function revokeCurrentSession(request, env) {
  const session = await getSession(request, env);
  if (session) await env.DB.prepare("UPDATE user_sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL").bind(nowSeconds(), session.id).run();
  return clearSessionHeaders();
}
