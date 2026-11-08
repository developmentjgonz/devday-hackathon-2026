import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { exportJWK, generateKeyPair, SignJWT } from 'jose'
import worker from '../../worker/index.ts'

const base = 'https://mews.example'
const clientId = 'test-google-client.apps.googleusercontent.com'
const redirectUri = `${base}/api/auth/google/callback`
const { privateKey, publicKey } = await generateKeyPair('RS256')
const jwk = { ...await exportJWK(publicKey), kid: 'test-key', alg: 'RS256', use: 'sig' }

function fixture(t) {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec('PRAGMA foreign_keys = ON')
  sqlite.exec(readFileSync(new URL('../../migrations/0001_accounts.sql', import.meta.url), 'utf8'))
  sqlite.exec(readFileSync(new URL('../../migrations/0012_user_photos.sql', import.meta.url), 'utf8'))
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
      try { const result = []; for (const statement of statements) result.push(await statement.run()); sqlite.exec('COMMIT'); return result }
      catch (error) { sqlite.exec('ROLLBACK'); throw error }
    },
  }
  const env = { DB, GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: 'a-test-secret-with-sufficient-randomness', GOOGLE_ADMIN_EMAIL: 'admin@gmail.com', GOOGLE_REDIRECT_URI: redirectUri, ASSETS: { fetch: () => new Response('app') } }
  function request(path, cookie = '') {
    return worker.fetch(new Request(`${base}${path}`, { headers: cookie ? { Cookie: cookie } : {} }), env)
  }
  return { sqlite, env, request }
}

async function openFlow(request) {
  const response = await request('/api/auth/google/start')
  assert.equal(response.status, 302)
  const url = new URL(response.headers.get('location'))
  assert.equal(url.origin, 'https://accounts.google.com')
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(url.searchParams.get('redirect_uri'), redirectUri)
  assert.equal(url.searchParams.get('scope'), 'openid email profile')
  const cookie = response.headers.getSetCookie().find((item) => item.startsWith('mews_google_state='))
  assert.match(cookie, /HttpOnly; SameSite=Lax; Max-Age=600; Secure/)
  return { url, cookie: cookie.split(';')[0] }
}

function installGoogle(t, profileForNonce) {
  const originalFetch = globalThis.fetch
  let tokenCalls = 0
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    if (url === 'https://www.googleapis.com/oauth2/v3/certs') return Response.json({ keys: [jwk] })
    if (url === 'https://oauth2.googleapis.com/token') {
      tokenCalls++
      const body = new URLSearchParams(init.body)
      assert.equal(body.get('client_id'), clientId)
      assert.equal(body.get('redirect_uri'), redirectUri)
      assert.ok(body.get('code_verifier'))
      const profile = profileForNonce()
      const token = await new SignJWT({ email: profile.email, email_verified: profile.emailVerified ?? true, name: profile.name ?? 'Example Member', nonce: profile.nonce, ...(profile.hd ? { hd: profile.hd } : {}) })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setIssuer('https://accounts.google.com').setAudience(profile.audience ?? clientId).setSubject(profile.subject).setIssuedAt().setExpirationTime('5m').sign(privateKey)
      return Response.json({ id_token: token })
    }
    throw new Error(`Unexpected fetch: ${url}`)
  }
  t.after(() => { globalThis.fetch = originalFetch })
  return { tokenCalls: () => tokenCalls }
}

async function finishFlow(request, flow) {
  return request(`/api/auth/google/callback?code=one-time-code&state=${encodeURIComponent(flow.url.searchParams.get('state'))}`, flow.cookie)
}
function sessionCookie(response) {
  const cookie = response.headers.getSetCookie().find((item) => item.startsWith('mews_session='))
  assert.ok(cookie, 'session cookie returned')
  assert.match(cookie, /HttpOnly; SameSite=Lax; Max-Age=43200; Secure/)
  return cookie.split(';')[0]
}

test('Google sign-in creates the specified administrator and leaves new members pending', async (t) => {
  const { request, sqlite } = fixture(t)
  let profile = { subject: 'google-admin', email: 'admin@gmail.com', name: 'Admin', nonce: '' }
  installGoogle(t, () => profile)
  const options = await (await request('/api/auth/options')).json()
  assert.equal(options.googleSignInEnabled, true)
  const adminFlow = await openFlow(request)
  profile.nonce = adminFlow.url.searchParams.get('nonce')
  const signedIn = await finishFlow(request, adminFlow)
  assert.equal(signedIn.headers.get('location'), '/app')
  const adminCookie = sessionCookie(signedIn)
  const admin = (await (await request('/api/auth/session', adminCookie)).json()).user
  assert.equal(admin.role, 'administrator')
  assert.equal(admin.status, 'active')
  const memberFlow = await openFlow(request)
  profile = { subject: 'google-member', email: 'member@gmail.com', name: 'Member', nonce: memberFlow.url.searchParams.get('nonce') }
  const memberResponse = await finishFlow(request, memberFlow)
  assert.equal(memberResponse.headers.get('location'), '/account-status')
  const member = (await (await request('/api/auth/session', sessionCookie(memberResponse))).json()).user
  assert.equal(member.role, 'member')
  assert.equal(member.status, 'pending')
  sqlite.prepare("UPDATE users SET status = 'suspended' WHERE id = ?").run(admin.id)
  const repeat = await openFlow(request)
  profile = { subject: 'google-admin', email: 'admin@gmail.com', nonce: repeat.url.searchParams.get('nonce') }
  const suspended = await finishFlow(request, repeat)
  assert.equal(suspended.headers.get('location'), '/account-status')
  assert.equal((await (await request('/api/auth/session', sessionCookie(suspended))).json()).user.status, 'suspended')
})

test('Google callback rejects forged state, nonce, audience, and unverified email', async (t) => {
  const { request, sqlite } = fixture(t)
  let profile = { subject: 'google-admin', email: 'admin@gmail.com', nonce: '' }
  const api = installGoogle(t, () => profile)
  const flow = await openFlow(request)
  const invalidState = await request('/api/auth/google/callback?code=one-time-code&state=forged', flow.cookie)
  assert.equal(invalidState.headers.get('location'), '/sign-in?google=error')
  assert.equal(api.tokenCalls(), 0)
  for (const bad of [{ nonce: 'wrong' }, { audience: 'different-client' }, { emailVerified: false }]) {
    const next = await openFlow(request)
    profile = { subject: 'google-admin', email: 'admin@gmail.com', nonce: next.url.searchParams.get('nonce'), ...bad }
    const response = await finishFlow(request, next)
    assert.equal(response.headers.get('location'), '/sign-in?google=error')
    assert.equal(response.headers.getSetCookie().some((item) => item.startsWith('mews_session=')), false)
  }
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM users').get().n, 0)
})

test('Google identities cannot silently claim existing email records or bootstrap a non-authoritative address', async (t) => {
  const { request, sqlite, env } = fixture(t)
  let profile = { subject: 'someone', email: 'other@example.com', nonce: '' }
  installGoogle(t, () => profile)
  sqlite.prepare("INSERT INTO users (id, name, email, role, status) VALUES ('existing', 'Existing', 'other@example.com', 'administrator', 'active')").run()
  const flow = await openFlow(request)
  profile.nonce = flow.url.searchParams.get('nonce')
  assert.equal((await finishFlow(request, flow)).headers.get('location'), '/sign-in?google=error')
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM sign_in_identities').get().n, 0)
  sqlite.prepare('DELETE FROM users WHERE id = ?').run('existing')
  env.GOOGLE_ADMIN_EMAIL = 'other@example.com'
  const next = await openFlow(request)
  profile = { subject: 'other', email: 'other@example.com', nonce: next.url.searchParams.get('nonce') }
  const pending = await finishFlow(request, next)
  assert.equal(pending.headers.get('location'), '/account-status')
  assert.equal(sqlite.prepare("SELECT role FROM users WHERE email = 'other@example.com'").get().role, 'member')
})

test('the configured verified Google Workspace account can bootstrap the administrator', async (t) => {
  const { request, env } = fixture(t)
  env.GOOGLE_ADMIN_EMAIL = 'owner@rescue.example'
  let profile = { subject: 'workspace-owner', email: 'owner@rescue.example', hd: 'rescue.example', nonce: '' }
  installGoogle(t, () => profile)
  const flow = await openFlow(request)
  profile.nonce = flow.url.searchParams.get('nonce')
  const response = await finishFlow(request, flow)
  assert.equal(response.headers.get('location'), '/app')
  const user = (await (await request('/api/auth/session', sessionCookie(response))).json()).user
  assert.equal(user.role, 'administrator')
  assert.equal(user.status, 'active')
})
