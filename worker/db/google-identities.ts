import { HTTPException } from 'hono/http-exception'
import type { SessionUser } from '../../shared/types/auth.ts'

type GoogleIdentity = { subject: string; email: string; name: string; authoritativeEmail: boolean }

async function findGoogleUser(db: D1Database, subject: string): Promise<SessionUser | null> {
  return db.prepare(`SELECT u.id, u.name, u.email, u.phone, u.role, u.status
    FROM sign_in_identities i JOIN users u ON u.id = i.user_id
    WHERE i.provider = 'google' AND i.subject = ?`).bind(subject).first<SessionUser>()
}

/** A verified Google subject is the identity. Existing email records are never linked implicitly. */
export async function signInGoogleUser(db: D1Database, identity: GoogleIdentity, adminEmail: string): Promise<SessionUser> {
  const existing = await findGoogleUser(db, identity.subject)
  if (existing) return existing
  const emailInUse = await db.prepare('SELECT id FROM users WHERE email = ?').bind(identity.email).first()
  if (emailInUse) throw new HTTPException(409, { message: 'This email already has an account. Contact an administrator.' })
  const id = crypto.randomUUID()
  const eligibleAdmin = identity.authoritativeEmail && identity.email === adminEmail.trim().toLowerCase()
  try {
    await db.batch([
      db.prepare(`INSERT INTO users (id, name, email, role, status)
        VALUES (?, ?, ?,
          CASE WHEN ? = 1 AND NOT EXISTS (SELECT 1 FROM users admin WHERE admin.role = 'administrator' AND NOT EXISTS (SELECT 1 FROM sign_in_identities i WHERE i.user_id = admin.id AND i.provider = 'demo-admin')) THEN 'administrator' ELSE 'member' END,
          CASE WHEN ? = 1 AND NOT EXISTS (SELECT 1 FROM users admin WHERE admin.role = 'administrator' AND NOT EXISTS (SELECT 1 FROM sign_in_identities i WHERE i.user_id = admin.id AND i.provider = 'demo-admin')) THEN 'active' ELSE 'pending' END)`)
        .bind(id, identity.name, identity.email, Number(eligibleAdmin), Number(eligibleAdmin)),
      db.prepare("INSERT INTO sign_in_identities (provider, subject, user_id) VALUES ('google', ?, ?)").bind(identity.subject, id),
    ])
  } catch (error) {
    // A second callback for the same Google account can race the first one.
    const concurrent = await findGoogleUser(db, identity.subject)
    if (concurrent) return concurrent
    throw error
  }
  const created = await findGoogleUser(db, identity.subject)
  if (!created) throw new HTTPException(503, { message: 'Could not create the account. Try again.' })
  return created
}
