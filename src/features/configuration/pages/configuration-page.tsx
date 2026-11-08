import { useEffect, useState } from 'react'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import { useRouteLoaderData } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Heading, Text } from '@/components/ui/typography'
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
        : <div className="space-y-8">
          <DemoAccess initial={enabled} store={store} />
          <section className="space-y-4" aria-labelledby="public-reporting-title">
            <div className="space-y-2"><Heading id="public-reporting-title" level={2} size="card">Public reporting</Heading><Text size="small" tone="muted">Anyone can use the public form without an account or contact details. Reports appear in the team inbox.</Text></div>
            <Card><CardContent><Button variant="outline" render={<a href="/report" />}>Open public report form <ArrowUpRight aria-hidden="true" /></Button></CardContent></Card>
          </section>
        </div>}
  </div>
}
