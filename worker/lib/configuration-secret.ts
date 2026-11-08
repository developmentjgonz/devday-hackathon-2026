import { HTTPException } from 'hono/http-exception'

type EncryptedSecret = { ciphertext: string; nonce: string }

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

export async function configurationKey(value: string | undefined): Promise<CryptoKey | null> {
  if (!value || !/^[A-Za-z0-9+/]{43}=$/.test(value)) return null
  try {
    const bytes = fromBase64(value)
    if (bytes.length !== 32) return null
    return await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
  } catch {
    return null
  }
}

export async function encryptConfigurationSecret(key: CryptoKey | null, value: string): Promise<EncryptedSecret> {
  if (!key) throw new HTTPException(503, { message: 'Secure key storage is unavailable.' })
  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, new TextEncoder().encode(value))
  return { ciphertext: toBase64(new Uint8Array(encrypted)), nonce: toBase64(nonce) }
}

export async function canReadConfigurationSecret(key: CryptoKey | null, secret: EncryptedSecret): Promise<boolean> {
  if (!key) return false
  try {
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(secret.nonce) }, key, fromBase64(secret.ciphertext))
    return true
  } catch {
    return false
  }
}

export async function decryptConfigurationSecret(key: CryptoKey | null, secret: EncryptedSecret): Promise<string> {
  if (!key) throw new HTTPException(503, { message: 'The OpenAI key is unavailable. Ask an administrator to check AI settings.' })
  try {
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(secret.nonce) }, key, fromBase64(secret.ciphertext))
    return new TextDecoder().decode(plaintext)
  } catch {
    throw new HTTPException(503, { message: 'The OpenAI key is unavailable. Ask an administrator to check AI settings.' })
  }
}
