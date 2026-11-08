import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useRouteLoaderData } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingIndicator } from '@/components/ui/loading-indicator'
import { authRequest } from '@/features/auth/auth'
import type { WorkspaceData } from '../../../../shared/types/directory'
import { DemoAccess, type DemoAccessStore } from '../components/demo-access'

type DemoAccessState = { demoSignInEnabled: boolean }
const store: DemoAccessStore = {
  setDemoAccess: (enabled) => authRequest<DemoAccessState>('/api/configuration/demo-access', { method: 'POST', body: JSON.stringify({ enabled }) }),
}

export function ConfigurationPage() {
  const { user } = useRouteLoaderData('workspace') as WorkspaceData
  return <>
    <title>Configuration · Mews</title>
    {user.role === 'administrator' ? <ConfigurationScreen />
      : <Card><EmptyState icon={<ShieldCheck />} title="Administrator access required" description="Ask an administrator if you need help with your account." /></Card>}
  </>
}

function ConfigurationScreen() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setError('')
    authRequest<DemoAccessState>('/api/configuration', { signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) setEnabled(result.demoSignInEnabled)
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Configuration is unavailable. Try again.')
    })
    return () => controller.abort()
  }, [reload])
  return <div className="max-w-3xl">
    {error ? <Card><EmptyState icon={<ShieldCheck />} tone="danger" title="Configuration unavailable" description={error} action={<Button variant="outline" onClick={() => setReload((value) => value + 1)}>Try again</Button>} /></Card>
      : enabled === null ? <div className="flex min-h-48 items-center justify-center"><LoadingIndicator label="Loading configuration" /></div>
        : <DemoAccess initial={enabled} store={store} />}
  </div>
}
