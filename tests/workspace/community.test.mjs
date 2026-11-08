import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import worker from '../../worker/index.ts';

function fixture(t) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  const migrations = new URL('../../migrations/', import.meta.url);
  for (const file of readdirSync(migrations).filter((name) => name.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL(file, migrations), 'utf8'));
  for (const file of ['../../seeds/local.sql', '../../seeds/workspace.sql']) sqlite.exec(readFileSync(new URL(file, import.meta.url), 'utf8'));
  t.after(() => sqlite.close());
  const DB = {
    prepare(sql) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async first() { return sqlite.prepare(sql).get(...values) ?? null; },
        async all() { return { results: sqlite.prepare(sql).all(...values) }; },
        async run() { return sqlite.prepare(sql).run(...values); },
      };
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  const env = { DB, LOCAL_TEST_SIGN_IN: 'true', ASSETS: { fetch: () => new Response('Public app') } };
  async function request(path, { method = 'GET', body, cookie, origin = 'http://127.0.0.1:5197', contentType = 'application/json' } = {}) {
    return worker.fetch(new Request(`http://127.0.0.1:5197${path}`, {
      method,
      headers: { ...(method !== 'GET' ? { Origin: origin, 'Content-Type': contentType } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }), env);
  }
  async function signIn(userId) {
    const response = await request('/api/auth/local/sign-in', { method: 'POST', body: { userId } });
    assert.equal(response.status, 200);
    return response.headers.get('Set-Cookie').split(';')[0];
  }
  return { sqlite, request, signIn };
}

const input = { sectionId: 'community-news', title: 'Food collection', description: 'Bring unopened cat food.', area: '', schedule: '', date: '2026-11-08' };

test('all board management routes require an active administrator and same-origin writes', async (t) => {
  const { request, signIn } = fixture(t);
  const operations = [
    ['/api/community-board', 'GET'],
    ['/api/community-board/sections', 'POST'],
    ['/api/community-board/sections/community-news', 'PATCH'],
    ['/api/community-board/posts', 'POST'],
    ['/api/community-board/posts/winter-supply-drive', 'PATCH'],
    ['/api/community-board/posts/winter-supply-drive/status', 'PATCH'],
  ];
  for (const [cookie, status] of [[undefined, 401], [await signIn('local-member'), 403], [await signIn('local-pending'), 403], [await signIn('local-suspended'), 403]]) {
    for (const [path, method] of operations) assert.equal((await request(path, { cookie, method, ...(method !== 'GET' ? { body: {} } : {}) })).status, status, `${method} ${path}`);
  }
  const cookie = await signIn('local-admin');
  for (const [path, method] of operations.slice(1)) assert.equal((await request(path, { cookie, method, body: {}, origin: 'https://other.example' })).status, 403);
  const response = await request('/api/community-board', { cookie });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('administrators add and edit sections and posts, then retire and restore without data loss', async (t) => {
  const { sqlite, request, signIn } = fixture(t);
  const cookie = await signIn('local-admin');
  const change = (path, body, method = 'PATCH') => request(`/api/community-board${path}`, { cookie, method, body });
  const created = await change('/sections', { title: '  Donations  ', layout: 'cards' }, 'POST');
  assert.equal(created.status, 201);
  const section = (await created.json()).sections.at(-1);
  assert.equal(section.title, 'Donations');
  const renamed = await change(`/sections/${section.id}`, { title: 'Community supplies', layout: 'list' });
  assert.equal(renamed.status, 200);
  assert.equal((await renamed.json()).sections.at(-1).layout, 'list');
  const published = await change('/posts', { ...input, sectionId: section.id }, 'POST');
  assert.equal(published.status, 201);
  const post = (await published.json()).posts.find((item) => item.title === input.title);
  assert.equal(post.published, true);
  const publicBoard = async () => (await (await request('/api/public-content')).json()).board;
  assert.ok((await publicBoard()).posts.some((item) => item.id === post.id));
  assert.equal((await change(`/posts/${post.id}`, { ...input, title: 'Winter food collection', area: 'North area', schedule: 'Saturday mornings' })).status, 200);
  const beforeRetirement = { ...sqlite.prepare('SELECT * FROM community_posts WHERE id = ?').get(post.id) };
  assert.equal(beforeRetirement.section_id, 'community-news');
  for (let round = 0; round < 2; round++) {
    assert.equal((await change(`/posts/${post.id}/status`, { published: false })).status, 200);
    assert.ok(!(await publicBoard()).posts.some((item) => item.id === post.id));
  }
  const retiredBoard = await (await request('/api/community-board', { cookie })).json();
  assert.equal(retiredBoard.posts.find((item) => item.id === post.id).published, false);
  assert.equal((await change(`/posts/${post.id}`, { ...input, title: 'Retired correction' })).status, 200);
  assert.ok(!(await publicBoard()).posts.some((item) => item.id === post.id));
  assert.equal((await change(`/posts/${post.id}/status`, { published: true })).status, 200);
  assert.equal((await publicBoard()).posts.find((item) => item.id === post.id).title, 'Retired correction');
  assert.equal((await change(`/posts/${post.id}`, { ...input, title: beforeRetirement.title, area: beforeRetirement.area, schedule: beforeRetirement.schedule })).status, 200);
  assert.deepEqual({ ...sqlite.prepare('SELECT * FROM community_posts WHERE id = ?').get(post.id) }, beforeRetirement);
});

test('invalid board input is rejected without changing published content', async (t) => {
  const { request, signIn } = fixture(t);
  const cookie = await signIn('local-admin');
  const before = await (await request('/api/community-board', { cookie })).json();
  const save = (body) => request('/api/community-board/posts', { cookie, method: 'POST', body });
  for (const invalid of [{ title: '   ' }, { description: '' }, { date: '2026-02-30' }, { date: 'yesterday' }, { title: 'x'.repeat(161) }, { description: 'x'.repeat(2001) }, { sectionId: '' }]) assert.equal((await save({ ...input, ...invalid })).status, 400);
  assert.equal((await save({ ...input, sectionId: 'missing' })).status, 404);
  assert.equal((await request('/api/community-board/sections', { cookie, method: 'POST', body: { title: ' ', layout: 'cards' } })).status, 400);
  assert.equal((await request('/api/community-board/posts', { cookie, method: 'POST', body: input, contentType: 'text/plain' })).status, 415);
  assert.equal((await request('/api/community-board/posts/missing/status', { cookie, method: 'PATCH', body: { published: false } })).status, 404);
  assert.equal((await request('/api/community-board/posts/winter-supply-drive/status', { cookie, method: 'PATCH', body: { published: 'false' } })).status, 400);
  assert.equal((await request('/api/community-board/sections/missing', { cookie, method: 'PATCH', body: { title: 'News', layout: 'list' } })).status, 404);
  assert.deepEqual(await (await request('/api/community-board', { cookie })).json(), before);
  assert.equal((await save({ ...input, description: '猫'.repeat(2000) })).status, 201);
});

test('section migration keeps existing published and retired posts and their details', (t) => {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  sqlite.exec('PRAGMA foreign_keys = ON');
  sqlite.exec(readFileSync(new URL('../../migrations/0011_public_content.sql', import.meta.url), 'utf8'));
  sqlite.exec("INSERT INTO community_posts (id, kind, title, description, area, schedule, published_date, published, position) VALUES ('old-opening', 'opening', 'Feeding route', 'Bring food', 'North', 'Monday', '', 1, 3), ('old-news', 'news', 'Old update', 'Retired details', '', '', '2026-11-01', 0, 2)");
  const before = sqlite.prepare('SELECT id, title, description, area, schedule, published_date, published, position FROM community_posts ORDER BY id').all();
  sqlite.exec(readFileSync(new URL('../../migrations/0031_community_board.sql', import.meta.url), 'utf8'));
  assert.deepEqual(sqlite.prepare('SELECT id, title, description, area, schedule, published_date, published, position FROM community_posts ORDER BY id').all(), before);
  assert.equal(sqlite.prepare("SELECT section_id FROM community_posts WHERE id = 'old-opening'").get().section_id, 'volunteer-openings');
  assert.equal(sqlite.prepare("SELECT section_id FROM community_posts WHERE id = 'old-news'").get().section_id, 'community-news');
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []);
});
