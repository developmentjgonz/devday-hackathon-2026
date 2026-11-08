import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { userPortraits } from '../seeds/user-portraits.ts'

const sheet = readFileSync(new URL('../public/fixtures/generated-user-portraits.svg', import.meta.url), 'utf8')
const sqlValue = (value) => `'${value.replaceAll("'", "''")}'`

/** Use the normal stored-photo path without changing account or upload behavior. */
export function userPhotosSeedSql() {
  return userPortraits.flatMap((person) => {
    if (!('email' in person)) return []
    const view = sheet.match(new RegExp(`<view id="${person.key}" viewBox="([^"]+)"`))?.[1]
    if (!view) throw new Error(`Missing portrait: ${person.key}`)
    const svg = sheet.replace(/width="1254" height="1254" viewBox="[^"]+"/, `width="418" height="418" viewBox="${view}"`)
    const data = Buffer.from(svg).toString('base64')
    const pendingRevision = `generated-portrait-v1:${person.key}:pending`
    const target = `revision = ${sqlValue(pendingRevision)}`
    const chunks = data.match(/.{1,64000}/g) ?? []
    return [`INSERT OR IGNORE INTO user_photos (user_id, mime_type, data, revision)
SELECT u.id, 'image/svg+xml', '', ${sqlValue(pendingRevision)}
FROM users u WHERE u.email = ${sqlValue(person.email)}${'id' in person ? ` AND u.id = ${sqlValue(person.id)}` : ''}
AND EXISTS (SELECT 1 FROM sign_in_identities i WHERE i.user_id = u.id AND i.provider IN ('local', 'demo', 'demo-admin'))
AND NOT EXISTS (SELECT 1 FROM sign_in_identities i WHERE i.user_id = u.id AND i.provider = 'google');`,
    // D1 limits each SQL statement to 100 KB. A pending revision also lets an
    // interrupted seed restart without touching complete or uploaded photos.
    `UPDATE user_photos SET data = '' WHERE ${target};`,
    ...chunks.map((chunk) => `UPDATE user_photos SET data = data || ${sqlValue(chunk)} WHERE ${target};`),
    `UPDATE user_photos SET revision = 'generated-portrait-v1' WHERE ${target};`]
  }).join('\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  if (args.some((argument) => argument !== '--remote') || args.length > 1) {
    throw new Error('Usage: node scripts/seed-user-photos.mjs [--remote]')
  }
  const location = args.includes('--remote') ? '--remote' : '--local'
  const directory = mkdtempSync(join(tmpdir(), 'mews-user-photos-'))
  try {
    const file = join(directory, 'user-photos.sql')
    writeFileSync(file, userPhotosSeedSql())
    const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url))
    const result = spawnSync(process.execPath, [wrangler, 'd1', 'execute', 'DB', location, '--file', file], {
      cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8',
    })
    if (result.error) throw result.error
    if (result.status === 0) console.log(`Generated profile photos are ready in the ${location.slice(2)} database.`)
    else process.stderr.write(result.stderr || result.stdout)
    process.exitCode = result.status ?? 1
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}
