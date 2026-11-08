const message = new TextEncoder().encode('mews-demo-admin-sign-in')

export function demoAdminCodeConfigured(secret: string | undefined): secret is string {
  return Boolean(secret && /^[A-Za-z0-9_-]{32,128}$/.test(secret))
}

/** Web Crypto verifies the MAC without comparing secrets in application code. */
export async function verifyDemoAdminCode(input: string, secret: string): Promise<boolean> {
  const algorithm = { name: 'HMAC', hash: 'SHA-256' }
  const inputKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(input), algorithm, false, ['sign'])
  const secretKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), algorithm, false, ['verify'])
  const signature = await crypto.subtle.sign('HMAC', inputKey, message)
  return crypto.subtle.verify('HMAC', secretKey, signature, message)
}
