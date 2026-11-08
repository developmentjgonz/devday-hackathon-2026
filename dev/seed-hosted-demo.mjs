import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { importSyntheticFixture } from '../worker/intake.js';
import { materializeCanonicalCensus, seedCanonicalCatsFromObservations } from '../worker/census.js';
import { triageReport } from '../worker/triage-agent.js';

const roles = ['admin', 'coordinator', 'volunteer', 'sponsor'];
const escape = value => value == null ? 'NULL' : typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
/** Builds an idempotent seed from the same parsers/projection as the application.
 * Only fixture records and salted password hashes enter this temporary SQL. */
export async function buildDemoSeed(encodedUsers) {
  const users = JSON.parse(encodedUsers || 'null');
  if (!Array.isArray(users) || users.length !== 4 || roles.some(role => !users.some(user => user.role === role && user.email === `${role}@mangrovemews.demo` && /^mews-demo-code-v1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{43}$/.test(user.passwordHash)))) throw new Error('Four salted, high-entropy synthetic access-code hashes are required in MEWS_DEMO_USERS_JSON.');
  const sqlite = new DatabaseSync(':memory:');
  for (const name of readdirSync('migrations').filter(name => name.endsWith('.sql')).sort()) sqlite.exec(readFileSync(`migrations/${name}`, 'utf8'));
  const at = new Date().toISOString();
  users.forEach(user => sqlite.prepare('INSERT INTO users (id,email,password_hash,role,created_at,updated_at) VALUES (?,?,?,?,?,?)').run(roles.indexOf(user.role) + 1, user.email, user.passwordHash, user.role, Math.floor(Date.now()/1000), Math.floor(Date.now()/1000)));
  function prepare(sql) {
    const query = sqlite.prepare(sql);
    const bind = (...params) => ({
      async run() { const row = query.run(...params); return { meta: { changes: Number(row.changes), last_row_id: Number(row.lastInsertRowid) } }; },
      async first() { return query.get(...params) ?? null; }, async all() { return { results: query.all(...params) }; },
    });
    return { bind, run: () => bind().run(), first: () => bind().first(), all: () => bind().all() };
  }
  const db = { prepare, async batch(statements) { sqlite.exec('BEGIN'); try { const rows=[]; for(const query of statements) rows.push(await query.run()); sqlite.exec('COMMIT'); return rows; } catch(error) {sqlite.exec('ROLLBACK');throw error;} } };
  for (const file of ['synthetic-intake-batch.json', 'synthetic-followup-shift.json', 'synthetic-weekend-shift.json']) {
    const fixture=JSON.parse(readFileSync(`public/demo-data/${file}`,'utf8'));
    const assessments={};
    for(const record of fixture.records)assessments[record.id]=await triageReport({message:record.text,source:record.sourceKind,catCount:record.count?.high},{});
    await importSyntheticFixture({db, fixture, assessments, now:at});
  }
  await seedCanonicalCatsFromObservations(db, {at}); await materializeCanonicalCensus(db, {materializedAt:at});
  const future = hours => new Date(Date.now()+hours*3600000).toISOString();
  sqlite.prepare("INSERT INTO feeding_assignments(id,colony_key,assigned_user_id,due_at,status,created_by,created_at) VALUES(?,?,?,?,?,?,?)").run('DEMO-FEED-LR','COL-02',3,future(-1),'scheduled',1,at);
  sqlite.prepare("INSERT INTO feeding_assignments(id,colony_key,assigned_user_id,due_at,status,created_by,created_at) VALUES(?,?,?,?,?,?,?)").run('DEMO-FEED-MB','COL-MB-DEMO',3,future(2),'scheduled',1,at);
  sqlite.prepare("INSERT INTO field_appointments(id,cat_key,kind,title,clinic_label,broad_area,due_at,assigned_user_id,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)").run('DEMO-APPT-POPPY','CAT-04','vet','Fictional Poppy follow-up transport','Demo care partner','Little Havana',future(3),3,1,at,at);
  sqlite.prepare("INSERT INTO supply_requests(id,colony_key,item_kind,quantity,note,needed_by,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)").run('DEMO-SUPPLY-LR','COL-02','dry_food',6,'Fictional evening shift needs six bags; log delivery only after handoff.',future(5),1,at);
  sqlite.prepare("INSERT INTO supply_pledges(id,request_id,user_id,quantity,updated_at) VALUES(?,?,?,?,?)").run('DEMO-PLEDGE-LR','DEMO-SUPPLY-LR',3,2,at);
  sqlite.prepare("INSERT INTO daily_handoffs(id,cat_key,colony_key,title,detail,priority,owner_user_id,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)").run('DEMO-HANDOFF-MB','CAT-11','COL-MB-DEMO','Fictional Beach shift: confirm access','Review the prior Tux report and check current conditions before preparing any public-access observation task.','urgent',3,1,at);
  for(const [kind,id] of [['appointment','DEMO-APPT-POPPY'],['supply','DEMO-SUPPLY-LR'],['handoff','DEMO-HANDOFF-MB']])sqlite.prepare("INSERT INTO field_tool_events(id,entity_kind,entity_id,actor_id,action,detail_json,created_at) VALUES(?,?,?,?,?,?,?)").run('DEMO-EVENT-'+id,kind,id,1,'synthetic_seed','{"synthetic":true,"source":"weekend demo preparation"}',at);
  const columns = table => sqlite.prepare(`PRAGMA table_info("${table}")`).all().map(column=>column.name);
  const tables = ['users','rescue_settings','intake_import_batches','intake_source_messages','intake_observations','intake_assessments','colony_census_events','feeder_visit_log','intake_review_queue','canonical_colonies','canonical_cats','feeding_assignments','field_appointments','supply_requests','supply_pledges','daily_handoffs','field_tool_events'];
  const statements=['-- Deliberately fictional Mews demo. Existing records are preserved.'];
  for(const table of tables) {
    const names=columns(table);
    for(const row of sqlite.prepare(`SELECT * FROM "${table}"`).all()) statements.push(`INSERT OR IGNORE INTO "${table}" (${names.map(name=>`"${name}"`).join(',')}) VALUES (${names.map(name=>escape(row[name])).join(',')});`);
  }
  sqlite.close(); return statements.join('\n')+'\n';
}

/** Refresh against remote records after seeding, retaining human merges/routing. */
export function hostedSnapshotRefresh(at=new Date().toISOString()) {
  return {params:[at,at],sql:`INSERT OR REPLACE INTO canonical_census_snapshots(id,colony_key,known_cat_records,urgent_open,tnr_pending,last_feeder_alias,last_fed_at,source_event_count,materialized_at)
    SELECT 'SNAP:'||cc.colony_key||':'||?,cc.colony_key,
      (SELECT COUNT(DISTINCT CASE WHEN c.status='deceased' THEN NULL ELSE COALESCE(NULLIF(c.canonical_cat_key,''),o.proposed_cat_key) END) FROM intake_observations o LEFT JOIN canonical_cats c ON c.cat_key=o.proposed_cat_key WHERE o.assigned_colony_key=cc.colony_key),
      (SELECT COUNT(DISTINCT q.id) FROM intake_review_queue q JOIN intake_observations o ON o.id=q.observation_id WHERE o.assigned_colony_key=cc.colony_key AND q.review_kind='urgent_care' AND q.status='open'),
      (SELECT COUNT(DISTINCT q.id) FROM intake_review_queue q JOIN intake_observations o ON o.id=q.observation_id WHERE o.assigned_colony_key=cc.colony_key AND q.review_kind='new_cat' AND q.status='open'),
      (SELECT m.volunteer_alias FROM intake_observations o JOIN intake_source_messages m ON m.id=o.source_message_id WHERE o.assigned_colony_key=cc.colony_key AND o.source_feeding_confirmed=1 ORDER BY julianday(m.received_at) DESC,o.id DESC LIMIT 1),
      (SELECT m.received_at FROM intake_observations o JOIN intake_source_messages m ON m.id=o.source_message_id WHERE o.assigned_colony_key=cc.colony_key AND o.source_feeding_confirmed=1 ORDER BY julianday(m.received_at) DESC,o.id DESC LIMIT 1),
      (SELECT COUNT(*) FROM intake_observations o WHERE o.assigned_colony_key=cc.colony_key),?
    FROM canonical_colonies cc`};
}
