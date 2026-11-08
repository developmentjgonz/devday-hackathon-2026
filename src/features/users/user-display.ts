import type { AccountStatus, UserRole } from '../../../shared/types/auth'

export const roleLabel = (role: UserRole) => role === 'administrator' ? 'Administrator' : 'Member'
export const statusLabel = (status: AccountStatus) => ({ pending: 'Awaiting approval', active: 'Active', suspended: 'Suspended' })[status]
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
export const formatJoined = (timestamp: number) => dateFormat.format(new Date(timestamp * 1000))
