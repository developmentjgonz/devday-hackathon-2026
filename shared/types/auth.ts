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

export interface SignInOptions {
  localSignInEnabled: boolean
  users: Omit<SessionUser, 'phone'>[]
}
