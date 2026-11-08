export type UserRole = 'administrator' | 'member'
export type AccountStatus = 'pending' | 'active' | 'suspended'

export interface SessionUser {
  id: string
  name: string
  email: string
  phone: string | null
  role: UserRole
  status: AccountStatus
}

export interface ManagedUser extends SessionUser {
  /** Unix timestamp in seconds. */
  createdAt: number
}

export interface UserAccessChange {
  role: UserRole
  status: Exclude<AccountStatus, 'pending'>
  expectedRole: UserRole
  expectedStatus: AccountStatus
}

export interface SignInOptions {
  localSignInEnabled: boolean
  googleSignInEnabled: boolean
  users: Omit<SessionUser, 'phone'>[]
}
