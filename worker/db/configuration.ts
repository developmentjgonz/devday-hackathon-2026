import type { AiInput, ChannelsInput } from '../../shared/schemas/configuration.ts'
import type { Configuration } from '../../shared/types/configuration.ts'
import { HTTPException } from 'hono/http-exception'
import { canReadConfigurationSecret, decryptConfigurationSecret, encryptConfigurationSecret } from '../lib/configuration-secret.ts'
import { demoAccessEnabled } from './demo-access.ts'
import { defaultReportChatPrompt } from '../../shared/report-chat-instructions.ts'

type ConfigurationRow = {
  inboundPhone: string
  inboundEmail: string
  phoneEnabled: number
  emailEnabled: number
  reportChatEnabled: number
  openaiModel: string
  reportChatPrompt: string
  ciphertext: string | null
  nonce: string | null
}

async function readRow(db: D1Database): Promise<ConfigurationRow> {
  const row = await db.prepare(`SELECT inbound_phone AS inboundPhone, inbound_email AS inboundEmail,
    phone_enabled AS phoneEnabled, email_enabled AS emailEnabled, report_chat_enabled AS reportChatEnabled,
    openai_model AS openaiModel, report_chat_prompt AS reportChatPrompt, openai_key_ciphertext AS ciphertext, openai_key_nonce AS nonce
    FROM configuration WHERE id = 1`).first<ConfigurationRow>()
  if (!row) throw new Error('Configuration is missing.')
  return row
}

export async function readConfiguration(db: D1Database, key: CryptoKey | null): Promise<Configuration> {
  const [row, demoSignInEnabled] = await Promise.all([readRow(db), demoAccessEnabled(db)])
  const openaiKeyStatus = !row.ciphertext || !row.nonce ? 'not-set'
    : await canReadConfigurationSecret(key, { ciphertext: row.ciphertext, nonce: row.nonce }) ? 'saved' : 'unavailable'
  return {
    demoSignInEnabled,
    inboundPhone: row.inboundPhone,
    inboundEmail: row.inboundEmail,
    phoneEnabled: Boolean(row.phoneEnabled),
    emailEnabled: Boolean(row.emailEnabled),
    reportChatEnabled: Boolean(row.reportChatEnabled),
    openaiModel: row.openaiModel,
    reportChatPrompt: row.reportChatPrompt || defaultReportChatPrompt,
    openaiKeyStatus,
    secureKeyStorageAvailable: key !== null,
  }
}

export async function openAiConfiguration(db: D1Database, key: CryptoKey | null): Promise<{ apiKey: string; model: string; reportChatPrompt: string }> {
  const row = await readRow(db)
  if (!row.ciphertext || !row.nonce) throw new HTTPException(503, { message: 'Ask an administrator to add an OpenAI key in AI settings.' })
  return {
    apiKey: await decryptConfigurationSecret(key, { ciphertext: row.ciphertext, nonce: row.nonce }),
    model: row.openaiModel || 'gpt-4.1-mini',
    reportChatPrompt: row.reportChatPrompt || defaultReportChatPrompt,
  }
}

export async function hasOpenAiConfiguration(db: D1Database, key: CryptoKey | null): Promise<boolean> {
  const row = await readRow(db)
  return Boolean(row.ciphertext && row.nonce && await canReadConfigurationSecret(key, { ciphertext: row.ciphertext, nonce: row.nonce }))
}

export async function saveChannels(db: D1Database, input: ChannelsInput): Promise<void> {
  await db.prepare('UPDATE configuration SET inbound_phone = ?, inbound_email = ?, phone_enabled = ?, email_enabled = ?, report_chat_enabled = ? WHERE id = 1')
    .bind(input.inboundPhone, input.inboundEmail, Number(input.phoneEnabled), Number(input.emailEnabled), Number(input.reportChatEnabled)).run()
}

export async function publicReportChatEnabled(db: D1Database): Promise<boolean> {
  const row = await db.prepare('SELECT report_chat_enabled AS enabled FROM configuration WHERE id = 1').first<{ enabled: number }>()
  return Boolean(row?.enabled)
}

export async function readPublicContacts(db: D1Database): Promise<{ phone: string | null; email: string | null }> {
  const row = await db.prepare(`SELECT CASE WHEN phone_enabled = 1 THEN inbound_phone ELSE NULL END AS phone,
    CASE WHEN email_enabled = 1 THEN inbound_email ELSE NULL END AS email FROM configuration WHERE id = 1`)
    .first<{ phone: string | null; email: string | null }>()
  if (!row) throw new Error('Configuration is missing.')
  return row
}

export async function saveAi(db: D1Database, key: CryptoKey | null, input: AiInput): Promise<void> {
  if (input.apiKey === undefined) {
    await db.prepare('UPDATE configuration SET openai_model = ?, report_chat_prompt = COALESCE(?, report_chat_prompt) WHERE id = 1').bind(input.openaiModel, input.reportChatPrompt ?? null).run()
    return
  }
  const secret = await encryptConfigurationSecret(key, input.apiKey)
  await db.prepare('UPDATE configuration SET openai_model = ?, report_chat_prompt = COALESCE(?, report_chat_prompt), openai_key_ciphertext = ?, openai_key_nonce = ? WHERE id = 1')
    .bind(input.openaiModel, input.reportChatPrompt ?? null, secret.ciphertext, secret.nonce).run()
}

export async function removeAiKey(db: D1Database): Promise<void> {
  await db.prepare('UPDATE configuration SET openai_key_ciphertext = NULL, openai_key_nonce = NULL WHERE id = 1').run()
}
