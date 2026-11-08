import type { AiInput, ChannelsInput } from '../../shared/schemas/configuration.ts'
import type { Configuration } from '../../shared/types/configuration.ts'
import { canReadConfigurationSecret, encryptConfigurationSecret } from '../lib/configuration-secret.ts'

type ConfigurationRow = {
  inboundPhone: string
  inboundEmail: string
  openaiModel: string
  ciphertext: string | null
  nonce: string | null
}

async function readRow(db: D1Database): Promise<ConfigurationRow> {
  const row = await db.prepare(`SELECT inbound_phone AS inboundPhone, inbound_email AS inboundEmail,
    openai_model AS openaiModel, openai_key_ciphertext AS ciphertext, openai_key_nonce AS nonce
    FROM configuration WHERE id = 1`).first<ConfigurationRow>()
  if (!row) throw new Error('Configuration is missing.')
  return row
}

export async function readConfiguration(db: D1Database, key: CryptoKey | null): Promise<Configuration> {
  const row = await readRow(db)
  const openaiKeyStatus = !row.ciphertext || !row.nonce ? 'not-set'
    : await canReadConfigurationSecret(key, { ciphertext: row.ciphertext, nonce: row.nonce }) ? 'saved' : 'unavailable'
  return {
    inboundPhone: row.inboundPhone,
    inboundEmail: row.inboundEmail,
    openaiModel: row.openaiModel,
    openaiKeyStatus,
    secureKeyStorageAvailable: key !== null,
  }
}

export async function saveChannels(db: D1Database, input: ChannelsInput): Promise<void> {
  await db.prepare('UPDATE configuration SET inbound_phone = ?, inbound_email = ? WHERE id = 1')
    .bind(input.inboundPhone, input.inboundEmail).run()
}

export async function saveAi(db: D1Database, key: CryptoKey | null, input: AiInput): Promise<void> {
  if (input.apiKey === undefined) {
    await db.prepare('UPDATE configuration SET openai_model = ? WHERE id = 1').bind(input.openaiModel).run()
    return
  }
  const secret = await encryptConfigurationSecret(key, input.apiKey)
  await db.prepare('UPDATE configuration SET openai_model = ?, openai_key_ciphertext = ?, openai_key_nonce = ? WHERE id = 1')
    .bind(input.openaiModel, secret.ciphertext, secret.nonce).run()
}

export async function removeAiKey(db: D1Database): Promise<void> {
  await db.prepare('UPDATE configuration SET openai_key_ciphertext = NULL, openai_key_nonce = NULL WHERE id = 1').run()
}
