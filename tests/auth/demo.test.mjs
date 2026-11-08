import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import worker from '../../worker/index.ts'
import { createDemoSession, createSession } from '../../worker/services/session.ts'

const base = 'https://mews.example'

function fixture(t) {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec('PRAGMA foreign_keys = ON')
  for (const file of ['0001_accounts.sql', '0002_colonies_and_cats.sql', '0003_cat_profiles.sql', '0012_user_photos.sql', '0018_demo_access.sql', '0019_session_auth_method.sql']) {
    sqlite.exec(readFileSync(new URL(`../../migrations/${file}`, import.meta.url), 'utf8'))
  }
  sqlite.exec(readFileSync(new URL('../../seeds/local.sql', import.meta.url), 'utf8'))
  sqlite.exec("UPDATE users SET role = 'member' WHERE id = 'local-admin'")
  sqlite.exec("INSERT INTO users (id, name, email, role, status) VALUES ('real-admin', 'Real Admin', 'admin@example.com', 'administrator', 'active')")
  sqlite.exec("INSERT INTO sign_in_identities (provider, subject, user_id) VALUES ('google', 'real-admin-subject', 'real-admin')")
  sqlite.exec(readFileSync(new URL('../../seeds/demo-accounts.sql', import.meta.url), 'utf8'))
  sqlite.exec(readFileSync(new URL('../../seeds/demo-administrator.sql', import.meta.url), 'utf8'))
  t.after(() => sqlite.close())
  const DB = {
    prepare(sql) {
      let values = []
      return {
        bind(...args) { values = args; return this },
        async first() { return sqlite.prepare(sql).get(...values) ?? null },
        async all() { return { results: sqlite.prepare(sql).all(...values) } },
        async run() { return sqlite.prepare(sql).run(...values) },
      }
    },
    async batch(statements) {
      sqlite.exec('BEGIN')
      try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results }
      catch (error) { sqlite.exec('ROLLBACK'); throw error }
    },
  }
  const limiter = { allowed: true, calls: 0, async limit() { this.calls++; return { success: this.allowed } } }
  const env = { DB, APP_ORIGIN: base, DEMO_ADMIN_CODE: 'a'.repeat(32), DEMO_ADMIN_RATE_LIMITER: limiter, ASSETS: { fetch: () => new Response('app') } }
  async function request(path, { method = 'GET', body, cookie, origin = base, host = base } = {}) {
    return worker.fetch(new Request(`${host}${path}`, {
      method,
      headers: { ...(method === 'POST' ? { Origin: origin, 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }), env)
  }
  async function adminSession() {
    return (await createSession(new Request(`${base}/`), DB, 'real-admin')).split(';')[0]
  }
  return { sqlite, DB, env, limiter, request, adminSession }
}

test('demo access is opt-in, limited to designated members, and separate from Google', async (t) => {
  const { request, adminSession } = fixture(t)
  const admin = await adminSession()
  const signIn = (userId, extra = {}) => request('/api/auth/demo/sign-in', { method: 'POST', body: { userId }, ...extra })
  assert.equal((await (await request('/api/auth/options')).json()).demoSignInEnabled, false)
  assert.equal((await signIn('local-member')).status, 404)
  assert.equal((await request('/api/configuration/demo-access', { method: 'POST', cookie: admin, body: { enabled: true } })).status, 200)
  const options = await (await request('/api/auth/options')).json()
  assert.equal(options.demoSignInEnabled, true)
  assert.deepEqual(new Set(options.users.map((user) => user.id)), new Set(['local-admin', 'local-member', 'local-pending', 'local-suspended']))
  assert.equal((await signIn('real-admin')).status, 404)
  assert.equal((await signIn('local-member', { origin: 'https://other.example' })).status, 403)
  assert.equal((await signIn('local-member', { host: 'http://mews.example' })).status, 404)
  assert.equal((await request('/api/auth/local/sign-up', { method: 'POST', body: { name: 'Stranger', email: 'stranger@example.com' } })).status, 404)
  const response = await signIn('local-member')
  assert.equal(response.status, 200)
  assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Lax; Max-Age=43200; Secure/)
  const demo = response.headers.get('set-cookie').split(';')[0]
  assert.equal((await request('/api/workspace', { cookie: demo })).status, 200)
  assert.equal((await request('/api/configuration', { cookie: demo })).status, 403)
  assert.equal((await request('/api/users', { cookie: demo })).status, 403)
  assert.equal((await request('/api/configuration/demo-access', { method: 'POST', cookie: demo, body: { enabled: false } })).status, 403)
})

test('disabling demo access invalidates its sessions without affecting the administrator', async (t) => {
  const { DB, sqlite, request, adminSession } = fixture(t)
  const admin = await adminSession()
  const setAccess = (enabled) => request('/api/configuration/demo-access', { method: 'POST', cookie: admin, body: { enabled } })
  await setAccess(true)
  const login = await request('/api/auth/demo/sign-in', { method: 'POST', body: { userId: 'local-member' } })
  const demo = login.headers.get('set-cookie').split(';')[0]
  assert.equal((await request('/api/workspace', { cookie: demo })).status, 200)
  assert.equal((await setAccess(false)).status, 200)
  assert.equal((await request('/api/workspace', { cookie: demo })).status, 401)
  assert.equal((await request('/api/workspace', { cookie: admin })).status, 200)
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM sessions WHERE user_id = 'local-member'").get().n, 0)
  await assert.rejects(createDemoSession(new Request(`${base}/`), DB, 'local-member'))
  await setAccess(true)
  assert.equal((await request('/api/workspace', { cookie: demo })).status, 401)
})

test('demo users cannot obtain administrator access or a real Google identity', async (t) => {
  const { sqlite, request, adminSession } = fixture(t)
  const admin = await adminSession()
  await request('/api/configuration/demo-access', { method: 'POST', cookie: admin, body: { enabled: true } })
  const login = await request('/api/auth/demo/sign-in', { method: 'POST', body: { userId: 'local-member' } })
  const demo = login.headers.get('set-cookie').split(';')[0]
  const promote = await request('/api/users/local-member/access', { method: 'POST', cookie: admin, body: { role: 'administrator', status: 'active', expectedRole: 'member', expectedStatus: 'active' } })
  assert.equal(promote.status, 400)
  assert.equal((await promote.json()).error, 'Demo accounts cannot be administrators.')
  sqlite.exec("UPDATE users SET role = 'administrator' WHERE id = 'local-member'")
  assert.equal((await request('/api/workspace', { cookie: demo })).status, 401)
  assert.equal((await request('/api/auth/demo/sign-in', { method: 'POST', body: { userId: 'local-member' } })).status, 404)
  sqlite.exec("UPDATE users SET role = 'member' WHERE id = 'local-member'")
  sqlite.exec("INSERT INTO sign_in_identities (provider, subject, user_id) VALUES ('google', 'unexpected-google', 'local-member')")
  assert.equal((await request('/api/workspace', { cookie: demo })).status, 401)
  assert.equal((await request('/api/auth/demo/sign-in', { method: 'POST', body: { userId: 'local-member' } })).status, 404)
})

test('the demo administrator requires a code and a working rate limiter', async (t) => {
  const { env, limiter, request, adminSession } = fixture(t)
  const admin = await adminSession()
  const login = (code, extra = {}) => request('/api/auth/demo-admin/sign-in', { method: 'POST', body: { code }, ...extra })
  assert.equal((await login('a'.repeat(32))).status, 404)
  await request('/api/configuration/demo-access', { method: 'POST', cookie: admin, body: { enabled: true } })
  assert.equal((await (await request('/api/auth/options')).json()).demoAdminSignInEnabled, true)
  assert.equal((await login('not-the-code')).status, 401)
  assert.equal((await login('a'.repeat(32), { origin: 'https://other.example' })).status, 403)
  limiter.allowed = false
  assert.equal((await login('a'.repeat(32))).status, 429)
  limiter.allowed = true
  env.DEMO_ADMIN_CODE = 'weak'
  assert.equal((await login('weak')).status, 404)
  env.DEMO_ADMIN_CODE = 'a'.repeat(32)
  env.DEMO_ADMIN_RATE_LIMITER = undefined
  assert.equal((await login('a'.repeat(32))).status, 404)
  assert.equal((await (await request('/api/auth/options')).json()).demoAdminSignInEnabled, false)
})

test('the demo administrator can view admin screens but cannot change real accounts', async (t) => {
  const { sqlite, request, adminSession } = fixture(t)
  const admin = await adminSession()
  await request('/api/configuration/demo-access', { method: 'POST', cookie: admin, body: { enabled: true } })
  const response = await request('/api/auth/demo-admin/sign-in', { method: 'POST', body: { code: 'a'.repeat(32) } })
  assert.equal(response.status, 200)
  const user = (await response.json()).user
  assert.equal(user.id, 'demo-administrator')
  assert.equal(user.role, 'administrator')
  const demoAdmin = response.headers.get('set-cookie').split(';')[0]
  assert.equal((await request('/api/users', { cookie: demoAdmin })).status, 200)
  assert.equal((await request('/api/configuration', { cookie: demoAdmin })).status, 200)
  const demote = await request('/api/users/real-admin/access', { method: 'POST', cookie: demoAdmin, body: { role: 'member', status: 'suspended', expectedRole: 'administrator', expectedStatus: 'active' } })
  assert.equal(demote.status, 409)
  assert.equal(sqlite.prepare("SELECT role FROM users WHERE id='real-admin'").get().role, 'administrator')
  const approve = await request('/api/users/local-pending/access', { method: 'POST', cookie: demoAdmin, body: { role: 'member', status: 'active', expectedRole: 'member', expectedStatus: 'pending' } })
  assert.equal(approve.status, 200)
  const promote = await request('/api/users/local-pending/access', { method: 'POST', cookie: demoAdmin, body: { role: 'administrator', status: 'active', expectedRole: 'member', expectedStatus: 'active' } })
  assert.equal(promote.status, 400)
  await request('/api/configuration/demo-access', { method: 'POST', cookie: admin, body: { enabled: false } })
  assert.equal((await request('/api/users', { cookie: demoAdmin })).status, 401)
  assert.equal((await request('/api/users', { cookie: admin })).status, 200)
  await request('/api/configuration/demo-access', { method: 'POST', cookie: admin, body: { enabled: true } })
  assert.equal((await request('/api/users', { cookie: demoAdmin })).status, 401)
})

test('a demo administrator session cannot become a real session if its identity is removed', async (t) => {
  const { sqlite, request, adminSession } = fixture(t)
  const admin = await adminSession()
  await request('/api/configuration/demo-access', { method: 'POST', cookie: admin, body: { enabled: true } })
  const response = await request('/api/auth/demo-admin/sign-in', { method: 'POST', body: { code: 'a'.repeat(32) } })
  const cookie = response.headers.get('set-cookie').split(';')[0]
  sqlite.exec("DELETE FROM sign_in_identities WHERE provider = 'demo-admin'")
  assert.equal((await request('/api/users', { cookie })).status, 401)
  await request('/api/configuration/demo-access', { method: 'POST', cookie: admin, body: { enabled: false } })
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM sessions WHERE auth_method = 'demo-admin'").get().n, 0)
})
