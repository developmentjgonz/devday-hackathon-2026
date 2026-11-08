import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import worker from '../../worker/index.ts';

function fixture(t) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const file of ['../../migrations/0001_accounts.sql', '../../migrations/0002_colonies_and_cats.sql', '../../migrations/0003_cat_profiles.sql', '../../migrations/0012_user_photos.sql', '../../migrations/0013_colony_addresses.sql', '../../migrations/0014_google_place_ids.sql', '../../seeds/local.sql']) {
    sqlite.exec(readFileSync(new URL(file, import.meta.url), 'utf8'));
  }
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
      try { const result = []; for (const statement of statements) result.push(await statement.run()); sqlite.exec('COMMIT'); return result; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  const env = { DB, LOCAL_TEST_SIGN_IN: 'true', ASSETS: { fetch: () => new Response('Public app') } };
  async function request(path, { method = 'GET', body, cookie, origin = 'http://127.0.0.1:5197' } = {}) {
    return worker.fetch(new Request(`http://127.0.0.1:5197${path}`, {
      method,
      headers: { ...(['POST', 'PATCH'].includes(method) ? { Origin: origin, 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
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

test('signed-in members can create a colony and cat that persist across requests', async (t) => {
  const { sqlite, request, signIn } = fixture(t);
  const cookie = await signIn('local-admin');
  const colonyResponse = await request('/api/directory/colonies', { method: 'POST', cookie, body: { name: '  Garden  ' } });
  assert.equal(colonyResponse.status, 201);
  const { colony } = await colonyResponse.json();
  assert.equal(colony.name, 'Garden');
  const catResponse = await request('/api/directory/cats', { method: 'POST', cookie, body: { name: ' Poppy ', colonyId: colony.id } });
  assert.equal(catResponse.status, 201);
  const { cat } = await catResponse.json();
  assert.equal(cat.name, 'Poppy');
  assert.equal(cat.colonyId, colony.id);
  assert.equal(sqlite.prepare('SELECT created_by FROM colonies WHERE id = ?').get(colony.id).created_by, 'local-admin');
  assert.equal(sqlite.prepare('SELECT colony_id FROM cats WHERE id = ?').get(cat.id).colony_id, colony.id);
  const member = await signIn('local-member');
  const response = await request('/api/directory', { cookie: member });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const directory = await response.json();
  assert.ok(directory.colonies.some((item) => item.id === colony.id && item.name === 'Garden'));
  assert.ok(directory.cats.some((item) => item.id === cat.id && item.colonyId === colony.id));
  assert.deepEqual(directory.colonies.find((item) => item.id === 'canal').coordinates, [-80.226, 25.797]);
});

test('directory reads and writes require an active account and same-origin writes', async (t) => {
  const { request, signIn } = fixture(t);
  for (const cookie of [undefined, await signIn('local-pending'), await signIn('local-suspended')]) {
    const expected = cookie ? 403 : 401;
    assert.equal((await request('/api/directory', { cookie })).status, expected);
    assert.equal((await request('/api/directory/colonies', { method: 'POST', cookie, body: { name: 'Garden' } })).status, expected);
  }
  const cookie = await signIn('local-member');
  assert.equal((await request('/api/directory/colonies', { method: 'POST', cookie, origin: 'https://other.example', body: { name: 'Garden' } })).status, 403);
  assert.equal((await request('/api/directory/cats', { method: 'POST', cookie, origin: '', body: { name: 'Poppy', colonyId: 'canal' } })).status, 403);
});

test('directory rejects invalid names and cats with missing colonies', async (t) => {
  const { sqlite, request, signIn } = fixture(t);
  const cookie = await signIn('local-admin');
  for (const body of [{}, { name: '   ' }, { name: 'x'.repeat(121) }]) {
    assert.equal((await request('/api/directory/colonies', { method: 'POST', cookie, body })).status, 400);
  }
  for (const body of [{ name: 'Cat' }, { name: ' ', colonyId: 'canal' }, { name: 'Cat', colonyId: '' }]) {
    assert.equal((await request('/api/directory/cats', { method: 'POST', cookie, body })).status, 400);
  }
  assert.equal((await request('/api/directory/cats', { method: 'POST', cookie, body: { name: 'Cat', colonyId: 'missing' } })).status, 404);
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM cats').get().count, 3);
  assert.throws(() => sqlite.prepare('INSERT INTO cats (id, name, colony_id) VALUES (?, ?, ?)').run('orphan', 'Cat', 'missing'));
});

test('colony locations can be set, moved, cleared, and read across requests', async (t) => {
  const { request, signIn } = fixture(t);
  const cookie = await signIn('local-member');
  const created = await request('/api/directory/colonies', { method: 'POST', cookie, body: { name: 'Garden', coordinates: [-80.25, 25.8] } });
  assert.equal(created.status, 201);
  const { colony } = await created.json();
  assert.deepEqual(colony.coordinates, [-80.25, 25.8]);
  const path = `/api/directory/colonies/${colony.id}/location`;
  const moved = await request(path, { method: 'PATCH', cookie, body: { coordinates: [-80.3, 25.9] } });
  assert.equal(moved.status, 200);
  assert.equal((await moved.json()).colony.name, 'Garden');
  let directory = await (await request('/api/directory', { cookie })).json();
  assert.deepEqual(directory.colonies.find((item) => item.id === colony.id).coordinates, [-80.3, 25.9]);
  const cleared = await request(path, { method: 'PATCH', cookie, body: { coordinates: null } });
  assert.equal(cleared.status, 200);
  directory = await (await request('/api/directory', { cookie })).json();
  assert.equal(directory.colonies.find((item) => item.id === colony.id).coordinates, undefined);
});

test('colony location changes validate coordinates and require active, same-origin access', async (t) => {
  const { request, signIn } = fixture(t);
  const cookie = await signIn('local-admin');
  const path = '/api/directory/colonies/canal/location';
  for (const coordinates of [[181, 25], [-80, -91], [-80], ['-80', 25], [null, 25]]) {
    assert.equal((await request(path, { method: 'PATCH', cookie, body: { coordinates } })).status, 400);
    assert.equal((await request('/api/directory/colonies', { method: 'POST', cookie, body: { name: 'Garden', coordinates } })).status, 400);
  }
  assert.equal((await request(path, { method: 'PATCH', cookie, body: {} })).status, 400);
  assert.equal((await request(path, { method: 'PATCH', body: { coordinates: [-80, 25] } })).status, 401);
  assert.equal((await request(path, { method: 'PATCH', cookie, origin: 'https://other.example', body: { coordinates: [-80, 25] } })).status, 403);
  assert.equal((await request('/api/directory/colonies/missing/location', { method: 'PATCH', cookie, body: { coordinates: [-80, 25] } })).status, 404);
});

test('a colony address is saved with its location and can be updated or cleared', async (t) => {
  const { request, signIn } = fixture(t);
  const cookie = await signIn('local-admin');
  const created = await request('/api/directory/colonies', { method: 'POST', cookie, body: { name: 'Garden', coordinates: [-80.2, 25.8], address: '  701 Brickell Avenue, Miami  ' } });
  assert.equal(created.status, 201);
  const { colony } = await created.json();
  assert.equal(colony.address, '701 Brickell Avenue, Miami');
  let directory = await (await request('/api/directory', { cookie })).json();
  assert.equal(directory.colonies.find((item) => item.id === colony.id).address, '701 Brickell Avenue, Miami');
  const path = `/api/directory/colonies/${colony.id}/location`;
  const moved = await request(path, { method: 'PATCH', cookie, body: { coordinates: [-80.21, 25.81], address: 'Near the garden' } });
  assert.equal((await moved.json()).colony.address, 'Near the garden');
  const cleared = await request(path, { method: 'PATCH', cookie, body: { coordinates: null } });
  assert.equal(cleared.status, 200);
  directory = await (await request('/api/directory', { cookie })).json();
  assert.equal(directory.colonies.find((item) => item.id === colony.id).address, undefined);
  assert.equal((await request(path, { method: 'PATCH', cookie, body: { coordinates: null, address: 'No pin' } })).status, 400);
  assert.equal((await request(path, { method: 'PATCH', cookie, body: { coordinates: [-80, 25], address: 'x'.repeat(501) } })).status, 400);
});

test('Google places persist only their place ID and can be replaced by a user pin', async (t) => {
  const { sqlite, request, signIn } = fixture(t);
  const cookie = await signIn('local-admin');
  const response = await request('/api/directory/colonies', { method: 'POST', cookie, body: { name: 'Garden', googlePlaceId: 'test-place-id' } });
  assert.equal(response.status, 201);
  const { colony } = await response.json();
  assert.equal(colony.googlePlaceId, 'test-place-id');
  const row = sqlite.prepare('SELECT google_place_id, longitude, latitude, address FROM colonies WHERE id = ?').get(colony.id);
  assert.deepEqual([row.google_place_id, row.longitude, row.latitude, row.address], ['test-place-id', null, null, null]);
  const path = `/api/directory/colonies/${colony.id}/location`;
  for (const body of [
    { coordinates: [-80, 25], googlePlaceId: 'test-place-id' },
    { coordinates: null, googlePlaceId: 'test-place-id', address: 'Google address' },
    { coordinates: null, googlePlaceId: '' },
  ]) assert.equal((await request(path, { method: 'PATCH', cookie, body })).status, 400);
  const moved = await request(path, { method: 'PATCH', cookie, body: { coordinates: [-80.2, 25.8], address: 'Near the garden' } });
  assert.equal(moved.status, 200);
  const updated = (await moved.json()).colony;
  assert.deepEqual(updated.coordinates, [-80.2, 25.8]);
  assert.equal(updated.googlePlaceId, undefined);
});


test('cat details and photos can be created, edited, read and removed', async (t) => {
  const { request, signIn } = fixture(t);
  const cookie = await signIn('local-admin');
  const data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZYAAAAASUVORK5CYII=';
  const input = { name: 'Poppy', colonyId: 'canal', birthDate: '2021-03-12', birthDateEstimated: true, description: 'White paws', photo: { mimeType: 'image/png', data } };
  const created = await request('/api/directory/cats', { method: 'POST', cookie, body: input });
  assert.equal(created.status, 201);
  const { cat } = await created.json();
  assert.equal(cat.birthDate, '2021-03-12');
  assert.equal(cat.birthDateEstimated, true);
  assert.equal(cat.description, 'White paws');
  assert.ok(cat.photoUrl.startsWith(`/api/directory/cats/${cat.id}/photo?v=`));
  assert.equal((await request(cat.photoUrl)).status, 401);
  const photo = await request(cat.photoUrl, { cookie });
  assert.equal(photo.status, 200);
  assert.equal(photo.headers.get('Content-Type'), 'image/png');
  assert.deepEqual(Buffer.from(await photo.arrayBuffer()), Buffer.from(data, 'base64'));
  const edited = await request(`/api/directory/cats/${cat.id}`, { method: 'PATCH', cookie, body: { ...input, name: 'Poppy updated', description: 'A friendly cat', photo: undefined } });
  assert.equal(edited.status, 200);
  const updated = (await edited.json()).cat;
  assert.equal(updated.photoUrl, cat.photoUrl);
  const directory = await (await request('/api/directory', { cookie })).json();
  assert.equal(directory.cats.find((item) => item.id === cat.id).description, 'A friendly cat');
  const removed = await request(`/api/directory/cats/${cat.id}`, { method: 'PATCH', cookie, body: { ...input, birthDate: '', photo: null } });
  assert.equal(removed.status, 200);
  assert.equal((await removed.json()).cat.photoUrl, undefined);
  assert.equal((await request(cat.photoUrl, { cookie })).status, 404);
});

test('cat profile changes validate dates and images and require the same origin', async (t) => {
  const { request, signIn } = fixture(t);
  const cookie = await signIn('local-admin');
  const input = { name: 'Pepper', colonyId: 'riverside', birthDate: '2020-01-02', description: '' };
  for (const bad of [
    { ...input, birthDate: '2020-02-30' },
    { ...input, birthDate: '2999-01-01' },
    { ...input, description: 'x'.repeat(2001) },
    { ...input, photo: { mimeType: 'image/png', data: 'bm90IGFuIGltYWdl' } },
    { ...input, photo: { mimeType: 'image/svg+xml', data: 'PHN2Zz4=' } },
  ]) assert.equal((await request('/api/directory/cats/pepper', { method: 'PATCH', cookie, body: bad })).status, 400);
  assert.equal((await request('/api/directory/cats/pepper', { method: 'PATCH', cookie, origin: 'https://elsewhere.example', body: input })).status, 403);
  assert.equal((await request('/api/directory/cats/missing', { method: 'PATCH', cookie, body: input })).status, 404);
  assert.equal((await request('/api/directory/cats/pepper', { method: 'PATCH', body: input })).status, 401);
});
