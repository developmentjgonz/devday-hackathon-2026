import { useState } from 'react'
import { useLoaderData, useNavigate } from 'react-router'
import type { SessionUser, SignInOptions } from '../../../../shared/types/auth'
import { accountPath, authRequest } from '../auth'
import { SignInScreen } from '../components/sign-in-screen'

export function SignInPage() {
  const { localSignInEnabled, users } = useLoaderData() as SignInOptions
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function signIn(userId: string) {
    setSelected(userId)
    setError('')
    try {
      const { user } = await authRequest<{ user: SessionUser }>('/api/auth/local/sign-in', {
        method: 'POST', body: JSON.stringify({ userId }),
      })
      await navigate(accountPath(user), { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in. Try again.')
    } finally {
      setSelected(null)
    }
  }

  return <SignInScreen localSignInEnabled={localSignInEnabled} users={users} selected={selected} error={error} onSignIn={signIn} />
}
