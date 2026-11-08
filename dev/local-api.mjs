import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { resolve, join } from "node:path";
import worker from "../worker/index.js";
import { provisionUser } from "../worker/auth.js";
import { materializeCanonicalCensus } from "../worker/census.js";

/** Explicit loopback-only synthetic runtime. Production uses Worker D1/R2 bindings. */
export async function createLocalApi(root, config = {}) {
  const stateDir = resolve(root, ".wrangler/local-demo");
  mkdirSync(join(stateDir, "photos"), { recursive: true });
  const sqlite = new DatabaseSync(join(stateDir, "mews.sqlite"));
  sqlite.exec("PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)");
  for (const name of readdirSync(resolve(root, "migrations")).filter((name) => name.endsWith(".sql")).sort()) {
    if (!sqlite.prepare("SELECT name FROM local_migrations WHERE name=?").get(name)) {
      sqlite.exec("BEGIN");
      try { sqlite.exec(readFileSync(resolve(root, "migrations", name), "utf8")); sqlite.prepare("INSERT INTO local_migrations VALUES (?)").run(name); sqlite.exec("COMMIT"); }
      catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    }
  }
  function prepare(sql) {
    const statement = sqlite.prepare(sql);
    function bind(...args) {
      const execute = () => {
        if (statement.columns().length) return { results: statement.all(...args), meta: {} };
        const result = statement.run(...args);
        return { results: [], meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
      };
      return { execute, run: async () => execute(), all: async () => execute(), first: async () => statement.get(...args) ?? null };
    }
    return { bind, run: () => bind().run(), all: () => bind().all(), first: () => bind().first() };
  }
  const DB = {
    prepare,
    async batch(statements) {
      sqlite.exec("BEGIN");
      try { const results = statements.map((statement) => statement.execute()); sqlite.exec("COMMIT"); return results; }
      catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  const objectPath = (key) => {
    if (!/^private\/[a-f0-9-]{36}$/i.test(key)) throw new Error("Invalid local object key");
    return join(stateDir, "photos", key.slice("private/".length));
  };
  const PHOTOS = {
    async put(key, bytes) { writeFileSync(objectPath(key), bytes); },
    async get(key) { const path = objectPath(key); return existsSync(path) ? { body: new Uint8Array(readFileSync(path)) } : null; },
    async delete(key) { const path = objectPath(key); if (existsSync(path)) unlinkSync(path); },
  };
  // Match the Worker's assets binding for server-side vision inputs, restricted
  // to fixture images rather than arbitrary URLs or local filesystem paths.
  const ASSETS = {
    async fetch(request) {
      const path = new URL(request.url).pathname;
      if (!/^\/demo-assets\/[a-z0-9-]+\.(png|jpe?g|webp)$/i.test(path)) return new Response("Not found", { status: 404 });
      const file = resolve(root, "public", path.slice(1));
      if (!existsSync(file)) return new Response("Not found", { status: 404 });
      const type = path.endsWith(".png") ? "image/png" : path.endsWith(".webp") ? "image/webp" : "image/jpeg";
      return new Response(new Uint8Array(readFileSync(file)), { headers: { "Content-Type": type } });
    },
  };
  const varsPath = resolve(root, ".dev.vars");
  const localVars = existsSync(varsPath) ? Object.fromEntries(readFileSync(varsPath, "utf8").split(/\r?\n/).filter((line) => /^[A-Z_]+=/.test(line.trim())).map((line) => { const equals = line.indexOf("="); return [line.slice(0, equals).trim(), line.slice(equals + 1).trim().replace(/^(["'])(.*)\1$/, "$2")]; })) : {};
  const env = { DB, PHOTOS, ASSETS, LOCAL_DEMO: true, GOOGLE_MAPS_BROWSER_KEY: config.GOOGLE_MAPS_BROWSER_KEY || localVars.GOOGLE_MAPS_BROWSER_KEY, APP_ORIGIN: "http://127.0.0.1:5197", OPENAI_API_KEY: process.env.MEWS_ENABLE_OPENAI === "1" ? config.OPENAI_API_KEY || localVars.OPENAI_API_KEY : undefined };
  for (const role of ["admin", "coordinator", "volunteer", "sponsor"]) {
    const email = role + "@mangrovemews.demo";
    if (!sqlite.prepare("SELECT id FROM users WHERE email=?").get(email)) await provisionUser(env, { email, password: "SyntheticMiami2026!", role });
  }
  // Apply routing migrations to the existing synthetic workspace immediately.
  await materializeCanonicalCensus(DB);
  async function middleware(incoming, outgoing, next) {
    if (!incoming.url?.startsWith("/api/")) return next();
    if (incoming.headers.host !== "127.0.0.1:5197" || !["127.0.0.1", "::ffff:127.0.0.1", "::1"].includes(incoming.socket.remoteAddress)) {
      outgoing.writeHead(403); outgoing.end("Loopback demo only"); return;
    }
    try {
      const chunks = []; let size = 0;
      for await (const chunk of incoming) { size += chunk.length; if (size > 6 * 1024 * 1024) { outgoing.writeHead(413); outgoing.end("Request too large"); return; } chunks.push(chunk); }
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) if (value) headers.set(name, Array.isArray(value) ? value.join(",") : value);
      headers.set("CF-Connecting-IP", "127.0.0.1");
      const request = new Request(env.APP_ORIGIN + incoming.url, { method: incoming.method, headers, ...(chunks.length ? { body: Buffer.concat(chunks) } : {}) });
      const response = await worker.fetch(request, env);
      outgoing.statusCode = response.status;
      for (const [name, value] of response.headers) if (name !== "set-cookie") outgoing.setHeader(name, value);
      // Browsers may reject Secure cookies over loopback HTTP. This adapter is never deployed.
      const cookies = response.headers.getSetCookie();
      if (cookies.length) outgoing.setHeader("Set-Cookie", cookies.map((cookie) => cookie.replace(/;\s*Secure/gi, "")));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      outgoing.statusCode = 500; outgoing.setHeader("Content-Type", "application/json");
      outgoing.end(JSON.stringify({ error: "Local backend failed", detail: error instanceof Error ? error.message : "Unknown error" }));
    }
  }
  return { middleware, close: () => sqlite.close() };
}
