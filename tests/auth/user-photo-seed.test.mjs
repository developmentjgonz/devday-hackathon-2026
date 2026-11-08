import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { userPhotosSeedSql } from '../../scripts/seed-user-photos.mjs'

test('portrait seeds use separate faces, preserve uploads, and exclude Google identities', () => {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(`CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT);
      CREATE TABLE sign_in_identities (user_id TEXT, provider TEXT);
      CREATE TABLE user_photos (user_id TEXT PRIMARY KEY, mime_type TEXT, data TEXT, revision TEXT);
      INSERT INTO users VALUES ('local-admin', 'admin@mews.test'), ('local-member', 'member@mews.test'),
        ('local-pending', 'pending@mews.test'), ('local-suspended', 'suspended@mews.test'),
        ('new-user', 'new@mews.test');
      INSERT INTO sign_in_identities SELECT id, 'local' FROM users;
      INSERT INTO sign_in_identities VALUES ('local-pending', 'google');
      INSERT INTO user_photos VALUES ('local-member', 'image/jpeg', 'uploaded-photo', 'upload-revision');`)
    const sql = userPhotosSeedSql()
    assert.ok(sql.split(';').every((statement) => Buffer.byteLength(statement) < 100_000))
    db.exec(sql)
    const photos = db.prepare('SELECT * FROM user_photos ORDER BY user_id').all()
    assert.equal(photos.length, 3)
    assert.equal(photos.find((photo) => photo.user_id === 'local-member').data, 'uploaded-photo')
    for (const [id, view] of [['local-admin', '0 0 418 418'], ['local-suspended', '0 418 418 418']]) {
      const photo = photos.find((item) => item.user_id === id)
      assert.equal(photo.mime_type, 'image/svg+xml')
      assert.ok(Buffer.from(photo.data, 'base64').toString().startsWith(`<svg xmlns="http://www.w3.org/2000/svg" width="418" height="418" viewBox="${view}">`))
      assert.equal(photo.revision, 'generated-portrait-v1')
    }
    db.exec(sql)
    assert.deepEqual(db.prepare('SELECT * FROM user_photos ORDER BY user_id').all(), photos)
  } finally {
    db.close()
  }
})
