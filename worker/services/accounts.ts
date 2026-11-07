import { HTTPException } from 'hono/http-exception'
import type { SignUpProfile } from '../../shared/schemas/auth.ts'
import type { SessionUser } from '../../shared/types/auth.ts'
import { findLocalUser, findUserByEmail, insertLocalUser } from '../db/accounts.ts'

export async function signInLocalUser(db: D1Database, userId: string): Promise<SessionUser> {
  const user = await findLocalUser(db, userId)
  if (!user) throw new HTTPException(404, { message: 'Test account was not found' })
  return user
}

function duplicateAccount(): HTTPException {
  return new HTTPException(409, { message: 'This email already has an account. Choose it on the sign-in page.' })
}

export async function signUpLocalUser(db: D1Database, profile: SignUpProfile): Promise<SessionUser> {
  if (await findUserByEmail(db, profile.email)) throw duplicateAccount()
  // Role and approval are assigned by the server, never by form fields.
  const user: SessionUser = { id: crypto.randomUUID(), ...profile, role: 'member', status: 'pending' }
  try {
    await insertLocalUser(db, user)
  } catch (error) {
    // Another request can create the same email after the initial check.
    if (await findUserByEmail(db, profile.email)) throw duplicateAccount()
    throw error
  }
  return user
}
