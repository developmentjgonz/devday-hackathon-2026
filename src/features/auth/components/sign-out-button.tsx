import { useState, type ComponentProps } from 'react'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { authRequest } from '../auth'

export function SignOutButton({ variant = 'outline', className }: Pick<ComponentProps<typeof Button>, 'variant' | 'className'>) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function signOut() {
    setBusy(true)
    setError('')
    try {
      await authRequest('/api/auth/sign-out', { method: 'POST' })
      await navigate('/sign-in', { replace: true })
    } catch {
      setError('Could not sign out. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant={variant} className={className} loading={busy} onClick={signOut}>
        {variant === 'ghost' ? <LogOut aria-hidden="true" /> : null}
        Sign out
      </Button>
      {error ? <p role="alert" className="max-w-56 text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
