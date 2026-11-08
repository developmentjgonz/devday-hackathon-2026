import type { DirectoryStore } from '@/features/colonies/directory-api'
import type { InboxData } from '@/features/inbox/types'
import type { SessionUser } from '../../../shared/types/auth'
import type { WorkspaceData } from '../../../shared/types/directory'
import { isReportReviewComplete, reviewedReportStatus } from '../../../shared/types/workspace'

/** Storybook keeps its isolated examples in memory. */
export const storyDirectoryStore: DirectoryStore = {
  async getActivity() { return [] },
  async addColony(name, coordinates, address, googlePlaceId) { return { id: crypto.randomUUID(), name: name.trim(), coordinates, address: address?.trim() || undefined, googlePlaceId } },
  async updateColonyLocation(colony, coordinates, address, googlePlaceId) { return { ...colony, coordinates: coordinates ?? undefined, address: address.trim() || undefined, googlePlaceId } },
  async addCat(input) { return { id: crypto.randomUUID(), name: input.name.trim(), colonyId: input.colonyId, birthDate: input.birthDate || undefined, birthDateEstimated: input.birthDate ? input.birthDateEstimated : undefined, description: input.description?.trim() || undefined, photoUrl: input.photo ? `data:${input.photo.mimeType};base64,${input.photo.data}` : undefined } },
  async updateCat(cat, input) { return { ...cat, name: input.name.trim(), colonyId: input.colonyId, birthDate: input.birthDate || undefined, birthDateEstimated: input.birthDate ? input.birthDateEstimated : undefined, description: input.description?.trim() || undefined, photoUrl: input.photo === undefined ? cat.photoUrl : input.photo ? `data:${input.photo.mimeType};base64,${input.photo.data}` : undefined } },
  async changeCatColony(cat, colonyId) { return { ...cat, colonyId } },
}

async function unavailable(): Promise<never> {
  await new Promise((resolve) => setTimeout(resolve, 400))
  throw new Error('The directory is unavailable. Try again.')
}
export const failingDirectoryStore: DirectoryStore = { getActivity: unavailable, addColony: unavailable, updateColonyLocation: unavailable, addCat: unavailable, updateCat: unavailable, changeCatColony: unavailable }

export function storyWorkspace(user: SessionUser, data: InboxData): WorkspaceData {
  const names = [...new Set([user.name, ...data.members, ...data.tasks.map((task) => task.owner)])]
  const members = names.map((name) => ({ id: name === user.name ? user.id : `story:${name}`, name }))
  const tasks = data.tasks.map((task) => ({ ...task, ownerId: members.find((member) => member.name === task.owner)!.id }))
  const reports = data.reports.map((report) => report.status !== 'dismissed' && isReportReviewComplete(report.status)
    ? { ...report, status: reviewedReportStatus(tasks.some((task) => task.reportId === report.id && task.status === 'open')) } : report)
  return { user, directory: { colonies: data.colonies, cats: data.cats }, workspace: { reports, tasks, members, careRules: [], aiAnalysisEnabled: false } }
}
