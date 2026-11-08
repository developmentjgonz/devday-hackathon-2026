import { redirect } from 'react-router'
import type { SessionUser, SignInOptions } from '../../../shared/types/auth'
import type { Directory, WorkspaceData } from '../../../shared/types/directory'
import type { WorkspaceSnapshot } from '../../../shared/types/workspace'
import { workspaceReturnTo } from '../../../shared/workspace-return-to'

export async function authRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error ?? 'We could not complete this request. Try again.')
  return body as T
}

export function accountPath(user: SessionUser, requestedPath?: string | null) {
  const destination = workspaceReturnTo(requestedPath)
  return user.status === 'active' ? destination : destination === '/app' ? '/account-status' : `/account-status?returnTo=${encodeURIComponent(destination)}`
}

export async function signInLoader({ request }: { request: Request }) {
  const [{ user }, options] = await Promise.all([
    authRequest<{ user: SessionUser | null }>('/api/auth/session', { signal: request.signal }),
    authRequest<SignInOptions>('/api/auth/options', { signal: request.signal }),
  ])
  if (user) throw redirect(accountPath(user, new URL(request.url).searchParams.get('returnTo')))
  return options
}

export async function signUpLoader(args: { request: Request }) {
  const options = await signInLoader(args)
  if (!options.localSignInEnabled) throw redirect('/sign-in')
  return null
}

export async function accountStatusLoader({ request }: { request: Request }) {
  const { user } = await authRequest<{ user: SessionUser | null }>('/api/auth/session', { signal: request.signal })
  if (!user) throw redirect('/sign-in')
  if (user.status === 'active') throw redirect(workspaceReturnTo(new URL(request.url).searchParams.get('returnTo')))
  return user
}

export async function workspaceLoader({ request }: { request: Request }): Promise<WorkspaceData> {
  const url = new URL(request.url)
  const destination = workspaceReturnTo(`${url.pathname}${url.search}`)
  const signInPath = destination === '/app' ? '/sign-in' : `/sign-in?returnTo=${encodeURIComponent(destination)}`
  const statusPath = destination === '/app' ? '/account-status' : `/account-status?returnTo=${encodeURIComponent(destination)}`
  const options: RequestInit = { credentials: 'same-origin', cache: 'no-store', signal: request.signal }
  const [response, directoryResponse, workspaceResponse] = await Promise.all([fetch('/api/workspace', options), fetch('/api/directory', options), fetch('/api/workspace-data', options)])
  if (response.status === 401) throw redirect(signInPath)
  if (response.status === 403) throw redirect(statusPath)
  if (directoryResponse.status === 401) throw redirect(signInPath)
  if (directoryResponse.status === 403) throw redirect(statusPath)
  if (workspaceResponse.status === 401) throw redirect(signInPath)
  if (workspaceResponse.status === 403) throw redirect(statusPath)
  if (!response.ok) throw new Error('The workspace is unavailable. Try again.')
  if (!directoryResponse.ok) throw new Error('The directory is unavailable. Try again.')
  if (!workspaceResponse.ok) throw new Error('The workspace is unavailable. Try again.')
  const { user } = await response.json() as { user: SessionUser }
  const directory = await directoryResponse.json() as Directory
  const workspace = await workspaceResponse.json() as WorkspaceSnapshot
  return { user, directory, workspace }
}
