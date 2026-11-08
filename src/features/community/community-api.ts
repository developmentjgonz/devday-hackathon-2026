import { authRequest } from '@/features/auth/auth'
import type { CommunityBoard } from '../../../shared/types/public'
import type { CommunityPostInput, CommunitySectionInput } from '../../../shared/schemas/community'

export type CommunityStore = {
  read: (signal?: AbortSignal) => Promise<CommunityBoard>
  saveSection: (input: CommunitySectionInput, id?: string) => Promise<CommunityBoard>
  savePost: (input: CommunityPostInput, id?: string) => Promise<CommunityBoard>
  setPublished: (id: string, published: boolean) => Promise<CommunityBoard>
}

const base = '/api/community-board'
export const databaseCommunity: CommunityStore = {
  read: (signal) => authRequest(base, { signal }),
  saveSection: (input, id) => authRequest(`${base}/sections${id ? `/${encodeURIComponent(id)}` : ''}`, { method: id ? 'PATCH' : 'POST', body: JSON.stringify(input) }),
  savePost: (input, id) => authRequest(`${base}/posts${id ? `/${encodeURIComponent(id)}` : ''}`, { method: id ? 'PATCH' : 'POST', body: JSON.stringify(input) }),
  setPublished: (id, published) => authRequest(`${base}/posts/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ published }) }),
}
