import { authRequest } from '@/features/auth/auth'
import type { AutomationSnapshot } from '../../../shared/types/automation'

export type AutomationStore = {
  read: (signal?: AbortSignal, offset?: number) => Promise<AutomationSnapshot>
  run: () => Promise<AutomationSnapshot>
  review: (id: string, approve: boolean) => Promise<AutomationSnapshot>
}
export const databaseAutomation: AutomationStore = {
  read: (signal, offset = 0) => authRequest(`/api/automation?offset=${offset}`, { signal }),
  run: () => authRequest('/api/automation/run', { method: 'POST' }),
  review: (id, approve) => authRequest(`/api/automation/reviews/${encodeURIComponent(id)}/${approve ? 'approve' : 'reject'}`, { method: 'POST' }),
}
