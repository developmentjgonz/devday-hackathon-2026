import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { communityCats, communityColonies } from '../seeds/community.ts'

const value = (item) => item == null ? 'NULL' : typeof item === 'number' ? String(item) : `'${String(item).replaceAll("'", "''")}'`
const row = (items) => `(${items.map(value).join(', ')})`

export function communitySeedSql() {
  const colonies = communityColonies.map((colony) => row([colony.id, colony.name, colony.coordinates[0], colony.coordinates[1], 'local-admin'])).join(',\n')
  const cats = communityCats.map((cat) => row([cat.id, cat.colonyId, cat.name, cat.photoUrl, 'local-admin', cat.birthDate, Number(cat.birthDateEstimated), cat.description])).join(',\n')
  return `INSERT OR IGNORE INTO colonies (id, name, longitude, latitude, created_by) VALUES\n${colonies};\nINSERT OR IGNORE INTO cats (id, colony_id, name, photo_url, created_by, birth_date, birth_date_estimated, description) VALUES\n${cats};`
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url))
  const result = spawnSync(process.execPath, [wrangler, 'd1', 'execute', 'DB', '--local', '--command', communitySeedSql()], { cwd: root, stdio: 'inherit' })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
}
