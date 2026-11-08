import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { communitySeedSql } from '../../scripts/seed-community.mjs'

test('the fictional community seed is complete and preserves local edits', (t) => {
  const db = new DatabaseSync(':memory:')
  t.after(() => db.close())
  db.exec('PRAGMA foreign_keys = ON')
  const migrations = new URL('../../migrations/', import.meta.url)
  for (const file of readdirSync(migrations).filter((name) => name.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(file, migrations), 'utf8'))
  db.exec(readFileSync(new URL('../../seeds/local.sql', import.meta.url), 'utf8'))
  db.exec(communitySeedSql())
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM colonies').get().count, 25)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM cats').get().count, 200)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM cats WHERE colony_id IS NULL').get().count, 0)
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM cats WHERE photo_url LIKE '/fixtures/generated-community-cats.svg%'").get().count, 197)
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM colonies WHERE id LIKE 'community-colony-%' AND longitude BETWEEN -80.32 AND -80.15 AND latitude BETWEEN 25.70 AND 25.86").get().count, 22)
  assert.equal(db.prepare("SELECT COUNT(DISTINCT longitude || ',' || latitude) AS count FROM colonies WHERE id LIKE 'community-colony-%'").get().count, 22)
  db.prepare("UPDATE colonies SET name = 'A local colony', longitude = -80.2, latitude = 25.8 WHERE id = 'community-colony-01'").run()
  db.prepare("UPDATE cats SET name = 'A local edit', photo_url = 'https://example.test/custom-cat.png' WHERE id = 'community-cat-001'").run()
  db.exec(communitySeedSql())
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM cats').get().count, 200)
  assert.deepEqual({ ...db.prepare("SELECT name, longitude, latitude FROM colonies WHERE id = 'community-colony-01'").get() }, { name: 'A local colony', longitude: -80.2, latitude: 25.8 })
  assert.equal(db.prepare("SELECT name FROM cats WHERE id = 'community-cat-001'").get().name, 'A local edit')
  assert.equal(db.prepare("SELECT photo_url FROM cats WHERE id = 'community-cat-001'").get().photo_url, 'https://example.test/custom-cat.png')
})
