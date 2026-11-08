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
  const visitorLimit = { allowed: true, async limit() { return { success: this.allowed }; } };
  const totalLimit = { allowed: true, async limit() { return { success: this.allowed }; } };
  const objects = new Map();
  const env = {
    UPLOADS: {
      async put(key, stream) { objects.set(key, await new Response(stream).arrayBuffer()); },
      async get(key) { const bytes = objects.get(key); return bytes ? { body: bytes, async arrayBuffer() { return bytes.slice(0); } } : null; },
      async delete(key) { objects.delete(key); },
    },
    AI_ANALYSIS_RATE_LIMITER: { async limit() { return { success: true }; } },
    DB, LOCAL_TEST_SIGN_IN: 'true', CONFIG_ENCRYPTION_KEY: Buffer.alloc(32, 42).toString('base64'),
    PUBLIC_CHAT_RATE_LIMITER: visitorLimit, PUBLIC_CHAT_TOTAL_LIMITER: totalLimit,
    PUBLIC_REPORT_RATE_LIMITER: { async limit() { return { success: true }; } },
    ASSETS: { fetch: () => new Response('Public app') },
  };
  async function request(path, { body, cookie, method, origin = 'http://127.0.0.1:5197' } = {}) {
    return worker.fetch(new Request(`http://127.0.0.1:5197${path}`, {
      method: method ?? (body === undefined ? 'GET' : 'POST'),
      headers: { ...(body === undefined && method !== 'POST' ? {} : { Origin: origin, ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) }), ...(cookie ? { Cookie: cookie } : {}) },
      ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }),
    }), env);
  }
  async function signIn(userId) {
    const response = await request('/api/auth/local/sign-in', { body: { userId } });
    assert.equal(response.status, 200);
    return response.headers.get('set-cookie').split(';')[0];
  }
  return { sqlite, env, request, signIn, visitorLimit, totalLimit, objects };
}

const channels = { inboundPhone: '', inboundEmail: '', phoneEnabled: false, emailEnabled: false, reportChatEnabled: true };
const firstMessage = { messages: [{ role: 'user', text: 'A cat is limping near Oak Street.' }] };

test('public chat requires explicit administrator enablement and is rate limited', async (t) => {
  const { sqlite, env, request, signIn, visitorLimit, totalLimit } = fixture(t);
  const admin = await signIn('local-admin');
  const member = await signIn('local-member');
  assert.equal((await request('/api/public-reports/chat', { body: firstMessage })).status, 404);
  assert.equal((await request('/api/configuration/channels', { cookie: member, body: channels })).status, 403);
  assert.equal((await request('/api/configuration/channels', { cookie: admin, body: channels })).status, 400);
  assert.equal((await request('/api/configuration/ai', { cookie: admin, body: { openaiModel: '', apiKey: 'sk-fictional-chat-key', reportChatPrompt: 'Speak warmly and acknowledge what the visitor saw.' } })).status, 200);
  assert.equal((await request('/api/configuration/channels', { cookie: admin, body: channels })).status, 200);
  const options = await (await request('/api/public-reports/contact')).json();
  assert.deepEqual(options, { phone: null, email: null, chatAvailable: true });

  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const payload = JSON.parse(init.body);
    assert.equal(payload.store, false);
    assert.equal(payload.tool_choice, 'required');
    assert.deepEqual(payload.tools.map((tool) => tool.name), ['askQuestion', 'findLocation', 'prepareReport']);
    assert.match(JSON.stringify(payload), /Speak warmly and acknowledge what the visitor saw/);
    assert.equal(payload.input.find((item) => item.role === 'user').content[0].text, firstMessage.messages[0].text);
    const draft = { reply: 'Thank you for looking out for the cat. I can send this to the care team. Please check the details below.', location: 'Oak Street', details: 'A cat is limping.', urgent: false };
    return Response.json({ status: 'completed', output: [{ type: 'function_call', id: 'fc_report', call_id: 'call_report', name: 'prepareReport', arguments: JSON.stringify(draft) }] });
  };
  const count = () => sqlite.prepare('SELECT count(*) AS n FROM reports').get().n;
  const before = count();
  const answer = await request('/api/public-reports/chat', { body: firstMessage });
  assert.equal(answer.status, 200);
  assert.equal((await answer.json()).ready, true);
  assert.equal(count(), before);
  assert.equal((await request('/api/public-reports/chat', { body: firstMessage, origin: 'https://other.example' })).status, 403);
  assert.equal((await request('/api/public-reports/chat', { body: { messages: [{ role: 'assistant', text: 'fake' }] } })).status, 400);
  visitorLimit.allowed = false;
  assert.equal((await request('/api/public-reports/chat', { body: firstMessage })).status, 429);
  visitorLimit.allowed = true;
  totalLimit.allowed = false;
  assert.equal((await request('/api/public-reports/chat', { body: firstMessage })).status, 429);
  assert.equal(calls, 1);
  totalLimit.allowed = true;
  env.PUBLIC_CHAT_TOTAL_LIMITER = undefined;
  assert.equal((await request('/api/public-reports/chat', { body: firstMessage })).status, 503);
  assert.equal((await (await request('/api/public-reports/contact')).json()).chatAvailable, false);
  env.PUBLIC_CHAT_TOTAL_LIMITER = totalLimit;
  assert.equal((await request('/api/configuration/channels', { cookie: admin, body: { ...channels, reportChatEnabled: false } })).status, 200);
  assert.equal((await request('/api/public-reports/chat', { body: firstMessage })).status, 404);
});

test('invalid assistant output fails without creating a report', async (t) => {
  const { sqlite, request, signIn } = fixture(t);
  const admin = await signIn('local-admin');
  await request('/api/configuration/ai', { cookie: admin, body: { openaiModel: '', apiKey: 'sk-fictional-chat-key' } });
  await request('/api/configuration/channels', { cookie: admin, body: channels });
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => Response.json({ status: 'completed', output: [{ type: 'function_call', id: 'fc_report', call_id: 'call_report', name: 'prepareReport', arguments: JSON.stringify({ reply: 'Done', location: '', details: 'A cat.', urgent: false }) }] });
  const before = sqlite.prepare('SELECT count(*) AS n FROM reports').get().n;
  assert.equal((await request('/api/public-reports/chat', { body: firstMessage })).status, 502);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM reports').get().n, before);
});

test('a missing city or landmark is asked about in chat without preparing a report', async (t) => {
  const { sqlite, request, signIn } = fixture(t);
  const admin = await signIn('local-admin');
  await request('/api/configuration/ai', { cookie: admin, body: { openaiModel: '', apiKey: 'sk-fictional-chat-key' } });
  await request('/api/configuration/channels', { cookie: admin, body: channels });
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const before = sqlite.prepare('SELECT count(*) AS n FROM reports').get().n;
  for (const reply of ['What did you notice that made the cat look hurt?', 'What city is that in?']) {
    const toolName = 'askQuestion';
    globalThis.fetch = async () => Response.json({ status: 'completed', output: [{ type: 'function_call', id: 'fc_question', call_id: 'call_question', name: toolName, arguments: JSON.stringify({ reply }) }] });
    const response = await request('/api/public-reports/chat', { body: firstMessage });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ready: false, reply, location: '', details: '', urgent: false, locations: [] });
  }
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM reports').get().n, before);
});

function functionCall(name, input) {
  return Response.json({ status: 'completed', output: [{ type: 'function_call', id: 'fc_location', call_id: 'call_location', name, arguments: JSON.stringify(input) }] });
}
function places(features, extent) {
  return Response.json({ type: 'FeatureCollection', features: features.map(([name, longitude, latitude]) => ({
    properties: { name, city: 'Miami', state: 'Florida', country: 'United States', ...(extent ? { extent } : {}) },
    geometry: { type: 'Point', coordinates: [longitude, latitude] },
  })) });
}
async function enableChat(t) {
  const context = fixture(t);
  const admin = await context.signIn('local-admin');
  await context.request('/api/configuration/ai', { cookie: admin, body: { openaiModel: '', apiKey: 'sk-fictional-chat-key' } });
  await context.request('/api/configuration/channels', { cookie: admin, body: channels });
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  return context;
}

test('the server searches the supplied area and keeps only nearby real places, then preserves the selected pin', async (t) => {
  const { request, sqlite } = await enableChat(t);
  let searchCalls = 0;
  let selected;
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('https://api.openai.com/')) {
      if (!selected) return functionCall('findLocation', { reply: 'I’ll look near that landmark.', query: 'McDonald’s', area: 'Miami, Florida' });
      assert.match(JSON.parse(init.body).input.at(-1).content[0].text, /Application location selection/);
      return functionCall('prepareReport', { reply: 'Please check these details.', location: selected.label, details: 'A cat was limping.', urgent: false });
    }
    const query = new URL(url);
    assert.equal(query.origin, 'https://photon.komoot.io');
    searchCalls++;
    if (searchCalls === 1) {
      assert.equal(query.searchParams.get('q'), 'Miami, Florida');
      return places([['Miami', -80.19, 25.77]], [-80.3, 25.79, -80.1, 25.75]);
    }
    assert.equal(query.searchParams.get('q'), 'McDonalds');
    assert.equal(query.searchParams.get('lat'), '25.77');
    assert.ok(query.searchParams.get('bbox'));
    return places([['McDonald’s', -80.2, 25.77], ['McDonald’s', -80.2, 25.77], ['Outside the named area', -80.2, 25.81], ['Another McDonald’s', -80.22, 25.78]]);
  };
  const before = sqlite.prepare('SELECT count(*) AS n FROM reports').get().n;
  const result = await (await request('/api/public-reports/chat', { body: firstMessage })).json();
  assert.equal(result.ready, false);
  assert.equal(result.locationSource, 'search');
  assert.equal(result.locations.length, 2);
  assert.equal(searchCalls, 2);
  selected = { label: result.locations[0].label, latitude: result.locations[0].latitude, longitude: result.locations[0].longitude };
  const review = await (await request('/api/public-reports/chat', { body: { ...firstMessage, selectedLocation: selected } })).json();
  assert.equal(review.ready, true);
  assert.deepEqual(review.mapLocation, { type: 'pin', latitude: 25.77, longitude: -80.2 });
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM reports').get().n, before);
});

test('an unresolved area or failed place search asks for details without inventing a match', async (t) => {
  const { request } = await enableChat(t);
  for (const unavailable of [false, true]) {
    let searches = 0;
    globalThis.fetch = async (url) => {
      if (String(url).startsWith('https://api.openai.com/')) return functionCall('findLocation', { reply: 'I’ll look there.', query: 'McDonald’s', area: 'Unknown town' });
      searches++;
      return unavailable ? new Response('', { status: 503 }) : places([]);
    };
    const response = await request('/api/public-reports/chat', { body: firstMessage });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.ready, false);
    assert.deepEqual(result.locations, []);
    assert.equal(searches, 1, 'An unknown area must not trigger a worldwide landmark search');
    assert.match(result.reply, unavailable ? /map lookup is unavailable/ : /couldn’t match/);
    assert.equal(result.locationFallback, 'McDonald’s, Unknown town');
    assert.equal(result.lastLocationSearch.outcome, unavailable ? 'unavailable' : 'not-found');
  }
});

test('possessive shop names find the downtown business instead of unrelated roads', async (t) => {
  const { request } = await enableChat(t);
  for (const query of ["McDonald's", 'McDonald’s', 'McDonalds']) {
    globalThis.fetch = async (url) => {
      if (String(url).startsWith('https://api.openai.com/')) return functionCall('findLocation', {
        reply: 'I’ll look near that shop.', query, area: 'Downtown Miami',
      });
      const search = new URL(url).searchParams.get('q');
      if (search === 'Downtown Miami') return places([['Downtown Miami', -80.191995, 25.7744981]]);
      // Photon returns these unrelated Miami places for the apostrophe spelling.
      if (search !== 'McDonalds') return places([['McDonald Road', -80.24739, 25.77545], ['Ronald McDonald House', -80.21303, 25.78876]]);
      return Response.json({ features: [{
        properties: { name: "McDonald's", housenumber: '345', street: 'Northeast 2nd Avenue', locality: 'Downtown Miami', city: 'Miami', state: 'Florida' },
        geometry: { type: 'Point', coordinates: [-80.1901555, 25.7779617] },
      }] });
    };
    const result = await (await request('/api/public-reports/chat', { body: {
      messages: [{ role: 'user', text: 'i spotted a cat in downtown miami by the mcdonalds' }],
    } })).json();
    assert.equal(result.locationSource, 'search');
    assert.equal(result.locations.length, 1);
    assert.equal(result.locations[0].title, "McDonald's");
    assert.match(result.locations[0].label, /345 Northeast 2nd Avenue/);
    assert.equal(result.ready, false);
  }
});

test('a nearby result in a different town is not suggested when the area has no boundary', async (t) => {
  const { request } = await enableChat(t);
  let searches = 0;
  globalThis.fetch = async (url) => {
    if (String(url).startsWith('https://api.openai.com/')) return functionCall('findLocation', { reply: 'I’ll look there.', query: 'McDonalds', area: 'Key Biscayne, Florida' });
    searches++;
    return searches === 1 ? places([['Key Biscayne', -80.1635, 25.6968]]) : places([['McDonalds', -80.1989, 25.7665]]);
  };
  const result = await (await request('/api/public-reports/chat', { body: firstMessage })).json();
  assert.equal(result.ready, false);
  assert.deepEqual(result.locations, []);
});

test('a tiny Key Largo footprint does not hide Publix or admit shops in other towns', async (t) => {
  const { request } = await enableChat(t);
  globalThis.fetch = async (url) => {
    if (String(url).startsWith('https://api.openai.com/')) return functionCall('findLocation', {
      reply: 'I’ll look for that shop.', query: 'Publix', area: 'Key Largo, Florida',
    });
    const params = new URL(url).searchParams;
    if (params.get('q') === 'Key Largo, Florida') return places(
      [['Key Largo', -80.4677741, 25.091338]], [-80.467909, 25.091449, -80.467629, 25.091209],
    );
    assert.equal(params.get('q'), 'Publix');
    const [west, south, east, north] = params.get('bbox').split(',').map(Number);
    assert.ok(west < -80.4211044 && east > -80.4211044 && south < 25.1125929 && north > 25.1125929,
      'The search area must include the real Publix, about 5 km from the locality footprint');
    return Response.json({ features: [
      { city: 'Key Largo', longitude: -80.4211044, latitude: 25.1125929, street: 'Overseas Highway', housenumber: '101499' },
      { city: 'A different town', longitude: -80.42, latitude: 25.11 },
      { city: 'Key Largo', longitude: -80.34, latitude: 25.091338 },
      { city: 'Key Largo', longitude: -80.4211044, latitude: 25.1125929, name: 'Unrelated shop' },
    ].map(({ longitude, latitude, ...properties }) => ({
      properties: { name: 'Publix', state: 'Florida', ...properties },
      geometry: { type: 'Point', coordinates: [longitude, latitude] },
    })) });
  };
  const result = await (await request('/api/public-reports/chat', { body: {
    messages: [{ role: 'user', text: 'cats spotted by publix in key largo florida' }],
  } })).json();
  assert.equal(result.ready, false);
  assert.equal(result.locationSource, 'search');
  assert.equal(result.locations.length, 1);
  assert.match(result.locations[0].label, /101499 Overseas Highway, Key Largo/);
  assert.equal(result.locations[0].latitude, 25.1125929);
  assert.equal(result.locations[0].longitude, -80.4211044);
});

test('a shared device pin needs confirmation, keeps its coordinates, and works when reverse lookup fails', async (t) => {
  const { request, sqlite } = await enableChat(t);
  const point = { latitude: 25.767088, longitude: -80.189696, accuracy: 20 };
  const before = sqlite.prepare('SELECT count(*) AS n FROM reports').get().n;
  for (const unavailable of [false, true]) {
    globalThis.fetch = async (url) => {
      assert.equal(new URL(url).pathname, '/reverse', 'Shared location confirmation does not call the model');
      return unavailable ? new Response('', { status: 503 }) : places([['Nearby shop', -80.1897, 25.7671]]);
    };
    const response = await request('/api/public-reports/chat', { body: { ...firstMessage, currentLocation: point } });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.ready, false);
    assert.match(result.reply, /Is this where you saw/);
    assert.equal(result.locations[0].latitude, point.latitude);
    assert.equal(result.locations[0].longitude, point.longitude);
    assert.match(result.locations[0].description, /20 m/);
    assert.match(result.locations[0].label, unavailable ? /25.767088/ : /Nearby shop/);
  }
  assert.equal((await request('/api/public-reports/chat', { body: { ...firstMessage, currentLocation: { ...point, latitude: 95 } } })).status, 400);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM reports').get().n, before);
});

test('a typed location correction does not keep the old selected pin', async (t) => {
  const { request } = await enableChat(t);
  globalThis.fetch = async () => functionCall('prepareReport', { reply: 'Please check the new location.', location: 'A different park in Miami', details: 'A cat was limping.', urgent: false });
  const response = await request('/api/public-reports/chat', { body: { ...firstMessage, selectedLocation: { label: 'Old park', latitude: 25.7, longitude: -80.2 } } });
  const result = await response.json();
  assert.equal(result.ready, true);
  assert.equal(result.mapLocation, undefined);
});

function chatWithFiles(files, input = firstMessage) {
  const form = new FormData();
  form.set('data', JSON.stringify(input));
  files.forEach((file) => form.append('files', file));
  return form;
}

test('chat attachments reach the model, save only on confirmation, and feed team analysis', async (t) => {
  const { sqlite, request, signIn, objects } = await enableChat(t);
  const member = await signIn('local-member');
  const files = [
    new File(['photo'], 'cat.png'),
    new File(['pdf'], 'notes.pdf', { type: 'application/pdf' }),
    new File(['word'], 'notes.docx'),
    new File(['A gray cat by the shed.'], 'notes.txt'),
    new File(['audio'], 'voice.ogg'),
  ];
  let analyses = 0;
  let transcriptions = 0;
  globalThis.fetch = async (url, init) => {
    if (url.endsWith('/audio/transcriptions')) {
      transcriptions++;
      assert.equal(init.body.get('file').name, 'voice.ogg');
      return Response.json({ text: 'The gray cat is by the shed.' });
    }
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const payload = JSON.parse(init.body);
    assert.equal(payload.store, false);
    const content = payload.input.at(-1).content;
    assert.ok(content.some((part) => part.type === 'input_image' && part.image_url === 'data:image/png;base64,cGhvdG8='));
    for (const filename of ['notes.pdf', 'notes.docx']) assert.ok(content.some((part) => part.type === 'input_file' && part.filename === filename && part.file_data.startsWith('data:')));
    assert.ok(content.some((part) => part.type === 'input_text' && part.text.includes('A gray cat by the shed.')));
    assert.ok(content.some((part) => part.type === 'input_text' && part.text.includes('The gray cat is by the shed.')));
    if (payload.tools) return functionCall('prepareReport', { reply: 'Please check the details and files.', location: 'Oak Street', details: 'A gray cat by the shed.', urgent: false });
    analyses++;
    return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ tasks: [{ title: 'Check the shed', reason: 'The recording and notes place the cat by the shed.' }], cats: [], colonies: [], duplicates: [] }) }] }] });
  };
  const before = sqlite.prepare('SELECT count(*) AS n FROM reports').get().n;
  const answer = await request('/api/public-reports/chat', { body: chatWithFiles(files) });
  assert.equal(answer.status, 200);
  const draft = await answer.json();
  assert.equal(draft.ready, true);
  assert.deepEqual(draft.skippedAttachments, []);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM reports').get().n, before);
  assert.equal(objects.size, 0);

  const saved = await request('/api/public-reports', { body: chatWithFiles(files, { location: draft.location, details: draft.details, urgent: draft.urgent }) });
  assert.equal(saved.status, 201);
  const report = sqlite.prepare("SELECT id FROM reports WHERE message = ?").get('Location: Oak Street\n\nDetails: A gray cat by the shed.');
  assert.ok(report);
  assert.equal(objects.size, 5);
  const rows = sqlite.prepare('SELECT id, name FROM report_attachments WHERE report_id = ? ORDER BY rowid').all(report.id);
  assert.deepEqual(rows.map((row) => row.name), files.map((file) => file.name));
  for (const [index, row] of rows.entries()) {
    const read = await request(`/api/attachments/${row.id}`, { cookie: member });
    assert.equal(read.status, 200);
    assert.equal(await read.text(), await files[index].text());
    assert.equal((await request(`/api/attachments/${row.id}`)).status, 401);
  }
  const analysis = await request(`/api/reports/${report.id}/analyze`, { method: 'POST', cookie: member });
  assert.equal(analysis.status, 200);
  assert.equal((await analysis.json()).suggestions.tasks[0].title, 'Check the shed');
  assert.equal(analyses, 1);
  assert.equal(transcriptions, 2);
});

test('chat rejects invalid files before calling the provider and keeps unreadable files explicit', async (t) => {
  const { request, objects, visitorLimit } = await enableChat(t);
  globalThis.fetch = async () => { throw new Error('Unexpected provider request'); };
  for (const files of [
    [new File([], 'empty.txt')],
    [new File(['bad'], 'program.exe')],
    Array.from({ length: 6 }, () => new File(['notes'], 'notes.txt')),
    [new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.txt')],
  ]) {
    const response = await request('/api/public-reports/chat', { body: chatWithFiles(files) });
    assert.equal(response.status, files[0].size > 10 * 1024 * 1024 ? 413 : 400);
  }
  visitorLimit.allowed = false;
  assert.equal((await request('/api/public-reports/chat', { body: chatWithFiles([new File(['audio'], 'voice.wav', { type: 'audio/wav' })]) })).status, 429);
  visitorLimit.allowed = true;
  globalThis.fetch = async (url, init) => {
    if (url.endsWith('/audio/transcriptions')) return Response.json({ error: 'private provider detail' }, { status: 500 });
    const content = JSON.parse(init.body).input.at(-1).content;
    assert.ok(content.some((part) => part.type === 'input_text' && part.text.includes('The recording could not be transcribed.')));
    assert.ok(content.some((part) => part.type === 'input_text' && part.text.includes('Useful notes')));
    return functionCall('askQuestion', { reply: 'Where did you see the cat?' });
  };
  const response = await request('/api/public-reports/chat', { body: chatWithFiles([
    new File(['audio'], 'voice.wav', { type: 'audio/wav' }), new File(['Useful notes'], 'notes.csv'),
  ]) });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).skippedAttachments, [{ name: 'voice.wav', reason: 'The recording could not be transcribed.' }]);
  assert.equal(objects.size, 0);
});

test('Dominos in Surfside rejects a fuzzy building match and does not repeat a failed search', async (t) => {
  const { request } = await enableChat(t);
  let searches = 0;
  let query = 'Dominos';
  globalThis.fetch = async (url) => {
    if (String(url).startsWith('https://api.openai.com/')) return functionCall('findLocation', { reply: 'I’ll check near that shop.', query, area: 'Surfside' });
    searches++;
    if (new URL(url).searchParams.get('q') === 'Surfside') return places([['Surfside', -80.1256, 25.8784]], [-80.138, 25.888, -80.115, 25.871]);
    // A similar name inside the search bounds is not the requested business.
    return places([['Domino One Condominium', -80.1258, 25.875]]);
  };
  const messages = [{ role: 'user', text: 'A cat is limping by Dominos in Surfside.' }];
  const result = await (await request('/api/public-reports/chat', { body: { messages } })).json();
  assert.deepEqual(result.locations, []);
  assert.equal(result.locationFallback, 'Dominos, Surfside');
  assert.equal(searches, 2);
  query = 'Domino’s';
  const repeated = await (await request('/api/public-reports/chat', { body: {
    messages: [...messages, { role: 'assistant', text: result.reply }, { role: 'user', text: 'Dominos in surfside' }],
    lastLocationSearch: result.lastLocationSearch,
  } })).json();
  assert.equal(searches, 2, 'Repeating the same failed place must not call the map service again');
  assert.match(repeated.reply, /You don’t need to repeat it/);
  assert.equal(repeated.locationFallback, 'Domino’s, Surfside');
});

test('a chosen location description can finish a report without a map pin or another lookup', async (t) => {
  const { request } = await enableChat(t);
  const label = 'Dominos, Surfside';
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const payload = JSON.parse(init.body);
    assert.match(JSON.stringify(payload), /written location description chosen by the visitor is a usable location/);
    assert.match(payload.input.at(-1).content[0].text, /Dominos, Surfside/);
    return functionCall('prepareReport', { reply: 'Please check these details.', location: label, details: 'A cat was limping by Dominos.', urgent: false });
  };
  const response = await request('/api/public-reports/chat', { body: {
    messages: [{ role: 'user', text: 'A cat was limping by Dominos in Surfside.' }, { role: 'assistant', text: 'We can use that description.' }, { role: 'user', text: `Use this location description: ${label}` }],
    locationDescription: label,
    lastLocationSearch: { query: 'Dominos', area: 'Surfside', outcome: 'not-found' },
  } });
  assert.equal(response.status, 200);
  const draft = await response.json();
  assert.equal(draft.ready, true);
  assert.equal(draft.location, label);
  assert.equal(draft.mapLocation, undefined);
});
