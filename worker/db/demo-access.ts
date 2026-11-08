export async function demoAccessEnabled(db: D1Database): Promise<boolean> {
  const row = await db.prepare('SELECT enabled FROM demo_access WHERE id = 1').first<{ enabled: number }>()
  return row?.enabled === 1
}

export async function setDemoAccess(db: D1Database, enabled: boolean): Promise<void> {
  const statements = [db.prepare('UPDATE demo_access SET enabled = ? WHERE id = 1').bind(Number(enabled))]
  if (!enabled) {
    statements.push(db.prepare("DELETE FROM sessions WHERE auth_method IN ('demo', 'demo-admin') OR user_id IN (SELECT user_id FROM sign_in_identities WHERE provider IN ('demo', 'demo-admin'))"))
  }
  await db.batch(statements)
}
