import { authRequest } from '@/features/auth/auth'
import type { ManagedUser, UserAccessChange } from '../../../shared/types/auth'

export interface UserStore {
  list(signal?: AbortSignal): Promise<ManagedUser[]>
  changeAccess(id: string, change: UserAccessChange): Promise<ManagedUser>
}

export const databaseUsers: UserStore = {
  async list(signal) {
    const { users } = await authRequest<{ users: ManagedUser[] }>('/api/users', { signal })
    return users
  },
  async changeAccess(id, change) {
    const { user } = await authRequest<{ user: ManagedUser }>(`/api/users/${encodeURIComponent(id)}/access`, {
      method: 'POST', body: JSON.stringify(change),
    })
    return user
  },
}
