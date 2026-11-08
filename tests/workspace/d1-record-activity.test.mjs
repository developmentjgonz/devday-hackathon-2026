import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { changeTaskStatus } from '../../worker/db/workspace.ts'

// Use Wrangler's D1 runtime so SQLite uses the same compound SELECT limit.
const { Miniflare } = createRequire(import.meta.resolve('wrangler'))('miniflare')

test('D1 saves task status and history for every related cat and colony', async (t) => {
  const mf = new Miniflare({ workers: [{ config: {
    name: 'task-activity-test',
    compatibilityDate: '2025-01-01',
    manifest: { mainModule: 'index.mjs', modulesRoot: '/', modules: { 'index.mjs': { type: 'esm', contents: 'export default { fetch() { return new Response("ok") } }' } } },
    env: { DB: { type: 'd1', id: 'task-activity-test' } },
  } }] })
  t.after(() => mf.dispose())
  const db = await mf.getD1Database('DB')
  const statements = [
    'CREATE TABLE users(id TEXT PRIMARY KEY, name TEXT NOT NULL)',
    'CREATE TABLE tasks(id TEXT PRIMARY KEY, title TEXT NOT NULL, owner_id TEXT NOT NULL, due TEXT NOT NULL, status TEXT NOT NULL, completed_at TEXT, completion_note TEXT, report_id TEXT, care_rule_id TEXT, created_at TEXT NOT NULL)',
    'CREATE TABLE task_associations(task_id TEXT, position INTEGER, type TEXT, record_id TEXT, label TEXT)',
    'CREATE TABLE cats(id TEXT PRIMARY KEY, colony_id TEXT)',
    'CREATE TABLE reports(id TEXT PRIMARY KEY, cat_id TEXT, colony_id TEXT)',
    'CREATE TABLE report_history(id TEXT PRIMARY KEY, report_id TEXT, actor_id TEXT, text TEXT, created_at TEXT)',
    'CREATE TABLE record_activity(id TEXT PRIMARY KEY, operation_id TEXT NOT NULL, record_type TEXT NOT NULL, record_id TEXT NOT NULL, kind TEXT NOT NULL, summary TEXT NOT NULL, changes_json TEXT NOT NULL, actor_id TEXT, actor_name TEXT NOT NULL, occurred_at TEXT NOT NULL, report_id TEXT)',
    "INSERT INTO users VALUES('admin','Alex')",
    "INSERT INTO cats VALUES('cat-linked','colony-from-cat'), ('cat-no-colony',NULL), ('cat-from-report','colony-from-report-cat')",
    "INSERT INTO reports VALUES('report','cat-from-report','colony-from-report')",
    "INSERT INTO tasks VALUES('task','Check the cats','admin','','open',NULL,NULL,'report',NULL,'2026-11-08')",
    "INSERT INTO task_associations VALUES('task',0,'cat','cat-linked',NULL), ('task',1,'cat','cat-no-colony',NULL), ('task',2,'colony','colony-direct',NULL)",
  ]
  await db.batch(statements.map((sql) => db.prepare(sql)))

  const actor = { id: 'admin', name: 'Alex', role: 'administrator' }
  assert.equal((await changeTaskStatus(db, 'task', actor, 'completed')).status, 'completed')
  const activity = await db.prepare('SELECT record_type AS type, record_id AS id FROM record_activity ORDER BY type, id').all()
  assert.deepEqual(activity.results.map(({ type, id }) => [type, id]), [
    ['cat', 'cat-from-report'], ['cat', 'cat-linked'], ['cat', 'cat-no-colony'],
    ['colony', 'colony-direct'], ['colony', 'colony-from-cat'], ['colony', 'colony-from-report'], ['colony', 'colony-from-report-cat'],
  ])
  assert.equal((await changeTaskStatus(db, 'task', actor, 'open')).status, 'open')
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM record_activity').first()).count, 14)
})
