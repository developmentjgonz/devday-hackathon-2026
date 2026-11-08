import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import worker from '../../worker/index.ts';

function fixture(t) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const file of ['../../migrations/0001_accounts.sql', '../../migrations/0002_colonies_and_cats.sql', '../../migrations/0003_cat_profiles.sql', '../../migrations/0010_reports_and_tasks.sql', '../../migrations/0012_user_photos.sql', '../../migrations/0013_colony_addresses.sql', '../../migrations/0014_google_place_ids.sql', '../../migrations/0015_record_activity.sql', '../../migrations/0019_session_auth_method.sql', '../../migrations/0021_cats_without_colonies.sql', '../../seeds/local.sql']) {
    sqlite.exec(readFileSync(new URL(file, import.meta.url), 'utf8'));
  }
  t.after(() => sqlite.close());
  const DB = {
    prepare(sql) {
      let values = [];
      return {
        read: /^\s*SELECT\b/i.test(sql),
        bind(...args) { values = args; return this; },
        async first() { return sqlite.prepare(sql).get(...values) ?? null; },
        async all() { return { results: sqlite.prepare(sql).all(...values) }; },
        async run() { return sqlite.prepare(sql).run(...values); },
      };
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const result = []; for (const statement of statements) result.push(await (statement.read ? statement.all() : statement.run())); sqlite.exec('COMMIT'); return result; }
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

test('cat colony migration preserves cats, photos, and report links', (t) => {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  sqlite.exec('PRAGMA foreign_keys = ON');
  const migrations = new URL('../../migrations/', import.meta.url);
  for (const file of readdirSync(migrations).filter((name) => name.endsWith('.sql') && name < '0021').sort()) sqlite.exec(readFileSync(new URL(file, migrations), 'utf8'));
  for (const file of ['../../seeds/local.sql', '../../seeds/workspace.sql']) {
    // This migration test needs directory fixtures only, before the later board schema.
    const seed = readFileSync(new URL(file, import.meta.url), 'utf8').split('\n').filter((line) => !line.startsWith('INSERT OR IGNORE INTO community_posts')).join('\n');
    sqlite.exec(seed);
  }
  sqlite.prepare('INSERT INTO cat_photos (cat_id, mime_type, data, revision) VALUES (?, ?, ?, ?)').run('miso', 'image/png', 'sample', 'revision');
  const tables = ['cats', 'cat_photos', 'reports', 'tasks'];
  const snapshot = () => tables.map((table) => sqlite.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all());
  const before = snapshot();
  sqlite.exec('BEGIN');
  sqlite.exec(readFileSync(new URL('../../migrations/0021_cats_without_colonies.sql', import.meta.url), 'utf8'));
  sqlite.exec('COMMIT');
  assert.deepEqual(snapshot(), before);
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  sqlite.prepare('UPDATE cats SET colony_id = NULL WHERE id = ?').run('miso');
  assert.equal(sqlite.prepare('SELECT colony_id FROM cats WHERE id = ?').get('miso').colony_id, null);
});

test('cats can be removed from and added to colonies without changing their profiles', async (t) => {
  const { sqlite, request, signIn } = fixture(t);
  const cookie = await signIn('local-admin');
  const change = (id, colonyId, expectedColonyId) => request(`/api/directory/cats/${id}/colony`, { method: 'PATCH', cookie, body: { colonyId, expectedColonyId } });
  const original = (await (await request('/api/directory', { cookie })).json()).cats.find((cat) => cat.id === 'miso');
  const removed = await change('miso', '', 'canal');
  assert.equal(removed.status, 200);
  assert.deepEqual((await removed.json()).cat, { ...original, colonyId: '' });
  assert.equal(sqlite.prepare('SELECT colony_id FROM cats WHERE id = ?').get('miso').colony_id, null);
  const edited = await request('/api/directory/cats/miso', { method: 'PATCH', cookie, body: { name: original.name, colonyId: '', description: 'White paws' } });
  assert.equal(edited.status, 200);
  assert.equal((await edited.json()).cat.colonyId, '');
  assert.equal((await change('miso', 'riverside', 'canal')).status, 409);
  assert.equal((await change('miso', 'missing', '')).status, 404);
  assert.equal((await change('missing', 'riverside', '')).status, 404);
  assert.equal((await change('miso', 'riverside', '')).status, 200);
  const persisted = (await (await request('/api/directory', { cookie })).json()).cats.find((cat) => cat.id === 'miso');
  assert.deepEqual(persisted, { ...original, colonyId: 'riverside', description: 'White paws' });
  const catActivity = (await (await request('/api/directory/cats/miso/activity', { cookie })).json()).activity;
  assert.ok(catActivity.some((entry) => entry.changes.some((item) => item.field === 'Colony' && item.before === 'Canal' && item.after === '')));
  assert.ok(catActivity.some((entry) => entry.changes.some((item) => item.field === 'Colony' && item.before === '' && item.after === 'Riverside')));
  assert.ok((await (await request('/api/directory/colonies/canal/activity', { cookie })).json()).activity.some((entry) => entry.summary === 'Cat moved out: Miso'));
  assert.ok((await (await request('/api/directory/colonies/riverside/activity', { cookie })).json()).activity.some((entry) => entry.summary === 'Cat moved in: Miso'));
  assert.equal((await request('/api/directory/cats/miso/colony', { method: 'PATCH', body: { colonyId: '', expectedColonyId: 'riverside' } })).status, 401);
  assert.equal((await request('/api/directory/cats/miso/colony', { method: 'PATCH', cookie, origin: 'https://other.example', body: { colonyId: '', expectedColonyId: 'riverside' } })).status, 403);
});

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
  const activity = (await (await request(`/api/directory/colonies/${colony.id}/activity`, { cookie })).json()).activity;
  assert.ok(activity.some((event) => event.summary === 'Location updated' && event.changes.some((change) => change.field === 'Location' && change.before.includes('701 Brickell Avenue') && change.after.includes('Near the garden'))));
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

test('cat and colony history records profile changes and moves with an actor', async (t) => {
  const { request, signIn } = fixture(t);
  const cookie = await signIn('local-admin');
  const created = await request('/api/directory/cats', { method: 'POST', cookie, body: { name: 'Poppy', colonyId: 'canal', description: 'White paws' } });
  const { cat } = await created.json();
  const updated = await request(`/api/directory/cats/${cat.id}`, { method: 'PATCH', cookie, body: { name: 'Poppy Rose', colonyId: 'riverside', birthDate: '2021-03-12', birthDateEstimated: true, description: 'White paws and tail' } });
  assert.equal(updated.status, 200);
  const path = `/api/directory/cats/${cat.id}/activity`;
  assert.equal((await request(path)).status, 401);
  const response = await request(path, { cookie });
  assert.equal(response.status, 200);
  const history = (await response.json()).activity;
  assert.deepEqual(history.map((entry) => entry.summary), ['Cat profile updated', 'Cat created']);
  assert.equal(history[0].actorName, 'Alex Morgan');
  assert.ok(history[0].changes.some((change) => change.field === 'Name' && change.before === 'Poppy' && change.after === 'Poppy Rose'));
  assert.ok(history[0].changes.some((change) => change.field === 'Colony' && change.before === 'Canal' && change.after === 'Riverside'));
  assert.ok(history[0].changes.some((change) => change.field === 'Birth date type' && change.before === '' && change.after === 'Estimated'));
  assert.ok((await (await request('/api/directory/colonies/canal/activity', { cookie })).json()).activity.some((entry) => entry.summary === 'Cat moved out: Poppy'));
  assert.ok((await (await request('/api/directory/colonies/riverside/activity', { cookie })).json()).activity.some((entry) => entry.summary === 'Cat moved in: Poppy Rose'));
  assert.equal((await request('/api/directory/cats/missing/activity', { cookie })).status, 404);
  await request(`/api/directory/cats/${cat.id}`, { method: 'PATCH', cookie, body: { name: 'Poppy Rose', colonyId: 'riverside', birthDate: '2021-03-12', birthDateEstimated: true, description: 'White paws and tail' } });
  assert.equal((await (await request(path, { cookie })).json()).activity.length, history.length);
});

test('the activity migration preserves known creation metadata without inventing old edits', (t) => {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const file of ['../../migrations/0001_accounts.sql', '../../migrations/0002_colonies_and_cats.sql', '../../migrations/0003_cat_profiles.sql', '../../migrations/0012_user_photos.sql', '../../migrations/0013_colony_addresses.sql', '../../migrations/0014_google_place_ids.sql', '../../seeds/local.sql', '../../migrations/0015_record_activity.sql']) sqlite.exec(readFileSync(new URL(file, import.meta.url), 'utf8'));
  const events = sqlite.prepare("SELECT summary, actor_name, occurred_at FROM record_activity WHERE record_type = 'cat' AND record_id = 'miso'").all();
  assert.equal(events.length, 1);
  assert.equal(events[0].summary, 'Cat created');
  assert.equal(events[0].actor_name, 'Alex Morgan');
  assert.ok(!Number.isNaN(Date.parse(events[0].occurred_at)));
});

test('a failed activity write rolls back the cat creation', async (t) => {
  const { sqlite, request, signIn } = fixture(t);
  const cookie = await signIn('local-admin');
  sqlite.exec('DROP TABLE record_activity');
  const response = await request('/api/directory/cats', { method: 'POST', cookie, body: { name: 'No partial cat', colonyId: 'canal' } });
  assert.equal(response.status, 503);
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM cats WHERE name = 'No partial cat'").get().count, 0);
});

test('statistics and both exports require an active administrator', async (t) => {
  const { request, signIn } = fixture(t);
  for (const path of ['/api/statistics', '/api/statistics/export?kind=summary', '/api/statistics/export?kind=cats']) {
    assert.equal((await request(path)).status, 401);
    for (const user of ['local-member', 'local-pending', 'local-suspended']) {
      assert.equal((await request(path, { cookie: await signIn(user) })).status, 403);
    }
    const response = await request(path, { cookie: await signIn('local-admin') });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
});

test('statistics exports include current counts, empty colonies, unassigned cats, and the selected colony only', async (t) => {
  const { sqlite, request, signIn } = fixture(t);
  const cookie = await signIn('local-admin');
  sqlite.prepare('UPDATE cats SET colony_id = NULL WHERE id = ?').run('miso');
  sqlite.prepare('INSERT INTO colonies (id, name) VALUES (?, ?)').run('empty', 'Empty colony');
  const data = await (await request('/api/statistics', { cookie })).json();
  assert.ok(Number.isFinite(Date.parse(data.asOf)));
  assert.equal(data.cats.length, 3);
  assert.equal(data.colonies.length, 4);
  assert.equal(data.cats.filter((cat) => !cat.colonyId).length, 1);
  const summary = await request('/api/statistics/export?kind=summary', { cookie });
  assert.match(summary.headers.get('Content-Type'), /^text\/csv/);
  assert.match(summary.headers.get('Content-Disposition'), /attachment; filename="mews-summary-\d{4}-\d{2}-\d{2}\.csv"/);
  const text = await summary.text();
  assert.match(text, /"Total","","All colonies","3","4","1"/);
  assert.match(text, /"Colony","empty","Empty colony","0","1","0"/);
  assert.match(text, /"Without a colony","","","1","0","1"/);
  const filtered = await (await request('/api/statistics/export?kind=summary&colonyId=riverside', { cookie })).text();
  assert.match(filtered, /"Total","","Riverside","1","1","0"/);
  assert.doesNotMatch(filtered, /"Canal"|"Miso"|"Empty colony"|"Without a colony"/);
  const cats = await (await request('/api/statistics/export?kind=cats&colonyId=riverside', { cookie })).text();
  assert.match(cats, /"pepper","Pepper","riverside","Riverside"/);
  assert.doesNotMatch(cats, /"Miso"|"Luna"/);
  assert.equal((await request('/api/statistics/export?kind=summary&colonyId=missing', { cookie })).status, 404);
  assert.equal((await request('/api/statistics/export?kind=other', { cookie })).status, 400);
  sqlite.exec('DELETE FROM cats; DELETE FROM colonies');
  const empty = await (await request('/api/statistics/export?kind=summary', { cookie })).text();
  assert.match(empty, /"Total","","All colonies","0","0","0"/);
  const emptyCats = await (await request('/api/statistics/export?kind=cats', { cookie })).text();
  assert.equal(emptyCats.trim().split('\r\n').length, 1);
});

test('CSV exports preserve Unicode, quotes and newlines and neutralize spreadsheet formulas', async (t) => {
  const { sqlite, request, signIn } = fixture(t);
  const cookie = await signIn('local-admin');
  sqlite.prepare('UPDATE cats SET name = ?, description = ?, birth_date = ?, birth_date_estimated = 1 WHERE id = ?')
    .run('猫, "Miso"', '\t=HYPERLINK("https://example.test")\nSecond line', '2024-05-01', 'miso');
  sqlite.prepare('UPDATE colonies SET name = ? WHERE id = ?').run('+SUM(1,2)', 'canal');
  const response = await request('/api/statistics/export?kind=cats', { cookie });
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 3)], [239, 187, 191]);
  const text = new TextDecoder().decode(bytes);
  assert.ok(text.includes('"猫, ""Miso"""'));
  assert.ok(text.includes('"\'+SUM(1,2)"'));
  assert.ok(text.includes('"\'\t=HYPERLINK(""https://example.test"")\nSecond line"'));
  assert.ok(text.includes('"2024-05-01","Yes"'));
});
