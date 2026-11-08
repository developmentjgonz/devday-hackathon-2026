import type { SessionUser } from './auth.ts'
import type { WorkspaceSnapshot } from './workspace.ts'

export type Coordinates = [longitude: number, latitude: number]
export type Colony = { id: string; name: string; photoUrl?: string; coordinates?: Coordinates; address?: string; googlePlaceId?: string }
export type Cat = { id: string; colonyId: string; name: string; photoUrl?: string; birthDate?: string; birthDateEstimated?: boolean; description?: string }
export type Directory = { colonies: Colony[]; cats: Cat[] }
export type WorkspaceData = { user: SessionUser; directory: Directory; workspace: WorkspaceSnapshot }
