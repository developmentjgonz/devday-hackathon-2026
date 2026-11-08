import type { Cat, Colony, Coordinates } from '../../../shared/types/directory'
import type { CatInput } from '../../../shared/schemas/directory'
import type { RecordActivity, RecordType } from '../../../shared/types/record-activity'
import { authRequest } from '@/features/auth/auth'

export type DirectoryStore = {
  getActivity: (type: RecordType, id: string, signal?: AbortSignal) => Promise<RecordActivity[]>
  addColony: (name: string, coordinates?: Coordinates, address?: string, googlePlaceId?: string) => Promise<Colony>
  updateColonyLocation: (colony: Colony, coordinates: Coordinates | null, address: string, googlePlaceId?: string) => Promise<Colony>
  addCat: (input: CatInput) => Promise<Cat>
  updateCat: (cat: Cat, input: CatInput) => Promise<Cat>
}

export const databaseDirectory: DirectoryStore = {
  async getActivity(type, id, signal) {
    const { activity } = await authRequest<{ activity: RecordActivity[] }>(`/api/directory/${type === 'cat' ? 'cats' : 'colonies'}/${encodeURIComponent(id)}/activity`, { signal })
    return activity
  },
  async addColony(name, coordinates, address, googlePlaceId) {
    const { colony } = await authRequest<{ colony: Colony }>('/api/directory/colonies', { method: 'POST', body: JSON.stringify({ name, coordinates, address, googlePlaceId }) })
    return colony
  },
  async updateColonyLocation(existing, coordinates, address, googlePlaceId) {
    const { colony } = await authRequest<{ colony: Colony }>(`/api/directory/colonies/${encodeURIComponent(existing.id)}/location`, { method: 'PATCH', body: JSON.stringify({ coordinates, address, googlePlaceId }) })
    return colony
  },
  async addCat(input) {
    const { cat } = await authRequest<{ cat: Cat }>('/api/directory/cats', { method: 'POST', body: JSON.stringify(input) })
    return cat
  },
  async updateCat(existing, input) {
    const { cat } = await authRequest<{ cat: Cat }>(`/api/directory/cats/${encodeURIComponent(existing.id)}`, { method: 'PATCH', body: JSON.stringify(input) })
    return cat
  },
}
