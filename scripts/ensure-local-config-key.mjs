import { randomBytes } from 'node:crypto'
import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEnv } from 'node:util'

// Wrangler reads .dev.vars exclusively when it exists; otherwise it merges .env files.
const localDirectory = process.cwd()
const devVars = join(localDirectory, '.dev.vars')
const dotenvFiles = ['.env.development.local', '.env.local', '.env.development', '.env'].map((name) => join(localDirectory, name))
const readKey = (file) => existsSync(file) ? parseEnv(readFileSync(file, 'utf8')).CONFIG_ENCRYPTION_KEY : undefined
const devVarsKey = readKey(devVars)
const dotenvKey = dotenvFiles.map(readKey).find((value) => value !== undefined)
const currentKey = existsSync(devVars) ? devVarsKey : dotenvKey

if (currentKey === undefined) {
  let key = dotenvKey
  if (key === undefined) {
    const stateDirectory = join(localDirectory, '.wrangler', 'state')
    const keyFile = join(stateDirectory, 'configuration-key')
    mkdirSync(stateDirectory, { recursive: true })
    try { writeFileSync(keyFile, randomBytes(32).toString('base64'), { flag: 'wx', mode: 0o600 }) }
    catch (error) { if (error.code !== 'EEXIST') throw error }
    // Two local servers can start together. Wait briefly for the first write to finish.
    for (let attempt = 0; attempt < 100; attempt++) {
      key = readFileSync(keyFile, 'utf8')
      if (/^[A-Za-z0-9+/]{43}=$/.test(key)) break
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10)
    }
    if (!key || !/^[A-Za-z0-9+/]{43}=$/.test(key)) throw new Error('The local configuration key is unavailable.')
  }
  const target = existsSync(devVars) ? devVars : join(localDirectory, '.env.local')
  if (existsSync(target)) chmodSync(target, statSync(target).mode & 0o700)
  appendFileSync(target, `\n# Keep this local key stable to read saved configuration secrets.\nCONFIG_ENCRYPTION_KEY=${JSON.stringify(key)}\n`, { mode: 0o600 })
}
