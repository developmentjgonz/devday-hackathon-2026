import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose'
import { HTTPException } from 'hono/http-exception'
import type { Bindings } from '../types.ts'

const authorizationEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth'
const tokenEndpoint = 'https://oauth2.googleapis.com/token'
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))
const cookieName = 'mews_google_state'
const encoder = new TextEncoder()

export type GoogleConfig = { clientId: string; clientSecret: string; adminEmail: string; redirectUri: string }
export function googleConfig(env: Bindings): GoogleConfig | null {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_ADMIN_EMAIL || !env.GOOGLE_REDIRECT_URI) return null
  let url: URL
  try { url = new URL(env.GOOGLE_REDIRECT_URI) } catch { return null }
  const local = url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if ((!local && url.protocol !== 'https:') || url.pathname !== '/api/auth/google/callback' || url.search || url.hash || url.username || url.password) return null
  return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, adminEmail: env.GOOGLE_ADMIN_EMAIL, redirectUri: url.href }
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}
function randomValue(): string { return base64url(crypto.getRandomValues(new Uint8Array(32))) }
async function stateKey(secret: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(`mews-google-oauth-state:${secret}`)))
}
function cookie(request: Request, value: string, maxAge: number) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${cookieName}=${value}; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}
export function clearGoogleCookie(request: Request) { return cookie(request, '', 0) }
function readCookie(request: Request): string | null {
  return request.headers.get('Cookie')?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) ?? null
}
function requireOrigin(request: Request, config: GoogleConfig) {
  if (new URL(request.url).origin !== new URL(config.redirectUri).origin) throw new HTTPException(400, { message: 'Google sign-in is not available at this address.' })
}

export async function startGoogleSignIn(request: Request, config: GoogleConfig) {
  requireOrigin(request, config)
  const state = randomValue()
  const nonce = randomValue()
  const verifier = randomValue()
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(verifier))))
  const signedState = await new SignJWT({ state, nonce, verifier }).setProtectedHeader({ alg: 'HS256' })
    .setIssuer('mews-google-oauth').setAudience(config.clientId).setIssuedAt().setExpirationTime('10m').sign(await stateKey(config.clientSecret))
  const url = new URL(authorizationEndpoint)
  url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: 'code', scope: 'openid email profile', state, nonce, code_challenge: challenge, code_challenge_method: 'S256' }).toString()
  return { url: url.href, cookie: cookie(request, signedState, 600) }
}

export async function verifyGoogleCallback(request: Request, config: GoogleConfig) {
  requireOrigin(request, config)
  const url = new URL(request.url)
  const token = readCookie(request)
  const state = url.searchParams.get('state')
  const code = url.searchParams.get('code')
  if (!token || !state || !code || state.length > 128 || code.length > 4096) throw new HTTPException(400, { message: 'Google sign-in could not be verified.' })
  let claims
  try {
    claims = (await jwtVerify(token, await stateKey(config.clientSecret), { algorithms: ['HS256'], issuer: 'mews-google-oauth', audience: config.clientId, requiredClaims: ['exp', 'iat'] })).payload
  } catch { throw new HTTPException(400, { message: 'Google sign-in expired. Try again.' }) }
  if (typeof claims.state !== 'string' || claims.state !== state || typeof claims.verifier !== 'string' || typeof claims.nonce !== 'string') {
    throw new HTTPException(400, { message: 'Google sign-in could not be verified.' })
  }
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: 'authorization_code', code_verifier: claims.verifier }),
  })
  if (!response.ok) throw new HTTPException(400, { message: 'Google sign-in could not be completed.' })
  const tokens = await response.json() as { id_token?: unknown }
  if (typeof tokens.id_token !== 'string') throw new HTTPException(400, { message: 'Google sign-in could not be completed.' })
  let profile
  try {
    profile = (await jwtVerify(tokens.id_token, googleKeys, { algorithms: ['RS256'], issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: config.clientId, maxTokenAge: '10m', clockTolerance: 30, requiredClaims: ['sub', 'exp', 'iat', 'email', 'email_verified', 'nonce'] })).payload
  } catch { throw new HTTPException(400, { message: 'Google sign-in could not be verified.' }) }
  if (profile.nonce !== claims.nonce || profile.email_verified !== true || (profile.azp !== undefined && profile.azp !== config.clientId) || (Array.isArray(profile.aud) && profile.aud.length > 1 && profile.azp !== config.clientId) || typeof profile.sub !== 'string' || profile.sub.length === 0 || profile.sub.length > 255 || typeof profile.email !== 'string') {
    throw new HTTPException(400, { message: 'Google sign-in could not be verified.' })
  }
  const email = profile.email.trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HTTPException(400, { message: 'A verified Google email is required.' })
  const domain = email.slice(email.lastIndexOf('@') + 1)
  const authoritativeEmail = domain === 'gmail.com' || (typeof profile.hd === 'string' && profile.hd.toLowerCase() === domain)
  const name = typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim().slice(0, 120) : email.slice(0, 120)
  return { subject: profile.sub, email, name, authoritativeEmail }
}
