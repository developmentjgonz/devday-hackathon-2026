import { useState } from 'react'
import { useLoaderData, useNavigate, useSearchParams } from 'react-router'
import type { SessionUser, SignInOptions } from '../../../../shared/types/auth'
import { accountPath, authRequest } from '../auth'
import { workspaceReturnTo } from '../../../../shared/workspace-return-to'
import { SignInScreen } from '../components/sign-in-screen'

export function SignInPage() {
  const { localSignInEnabled, demoSignInEnabled, googleSignInEnabled, users } = useLoaderData() as SignInOptions
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState('')
  const destination = workspaceReturnTo(searchParams.get('returnTo'))

  async function signIn(userId: string) {
    setSelected(userId)
    setError('')
    try {
      const { user } = await authRequest<{ user: SessionUser }>(demoSignInEnabled ? '/api/auth/demo/sign-in' : '/api/auth/local/sign-in', {
        method: 'POST', body: JSON.stringify({ userId }),
      })
      await navigate(accountPath(user, destination), { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in. Try again.')
    } finally {
      setSelected(null)
    }
  }

  const googleError = searchParams.has('google') ? 'Google sign-in could not be completed. Please try again.' : ''
  return <SignInScreen localSignInEnabled={localSignInEnabled} demoSignInEnabled={demoSignInEnabled} googleSignInEnabled={googleSignInEnabled} googleSignInHref={destination === '/app' ? '/api/auth/google/start' : `/api/auth/google/start?returnTo=${encodeURIComponent(destination)}`} users={users} selected={selected} error={error || googleError} onSignIn={signIn} />
}
