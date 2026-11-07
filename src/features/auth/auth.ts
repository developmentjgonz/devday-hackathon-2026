import { redirect } from 'react-router'
import type { SessionUser, SignInOptions } from '../../../shared/types/auth'

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

export function accountPath(user: SessionUser) {
  return user.status === 'active' ? '/app' : '/account-status'
}

export async function signInLoader({ request }: { request: Request }) {
  const [{ user }, options] = await Promise.all([
    authRequest<{ user: SessionUser | null }>('/api/auth/session', { signal: request.signal }),
    authRequest<SignInOptions>('/api/auth/options', { signal: request.signal }),
  ])
  if (user) throw redirect(accountPath(user))
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
  if (user.status === 'active') throw redirect('/app')
  return user
}

export async function workspaceLoader({ request }: { request: Request }) {
  const response = await fetch('/api/workspace', { credentials: 'same-origin', cache: 'no-store', signal: request.signal })
  if (response.status === 401) throw redirect('/sign-in')
  if (response.status === 403) throw redirect('/account-status')
  if (!response.ok) throw new Error('The workspace is unavailable. Try again.')
  const { user } = await response.json() as { user: SessionUser }
  return user
}
