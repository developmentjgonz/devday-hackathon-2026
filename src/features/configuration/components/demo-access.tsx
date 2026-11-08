import { useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from '@/components/ui/toaster'
import { Heading, Text } from '@/components/ui/typography'

export type DemoAccessStore = { setDemoAccess(enabled: boolean): Promise<{ demoSignInEnabled: boolean }> }

export function DemoAccess({ initial, store }: { initial: boolean; store: DemoAccessStore }) {
  const [enabled, setEnabled] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function toggle() {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const result = await store.setDemoAccess(!enabled)
      setEnabled(result.demoSignInEnabled)
      toast.success(result.demoSignInEnabled ? 'Demo sign-in enabled' : 'Demo sign-in disabled')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update demo sign-in. Try again.')
    } finally { setSaving(false) }
  }

  return <div className="space-y-6">
    <div className="space-y-2"><Heading level={2} size="card">Sign-in access</Heading><Text size="small" tone="muted">Choose how people can access the workspace.</Text></div>
    <Card><CardContent className="space-y-4">
      <Heading level={3} size="card">Demo sign-in {enabled ? 'is on' : 'is off'}</Heading>
      <Text size="small">When enabled, anyone can use a demo account to view and change workspace data. Turning it off signs out demo accounts.</Text>
      {error ? <Alert>{error}</Alert> : null}
      <Button type="button" variant={enabled ? 'outline' : 'default'} loading={saving} onClick={() => void toggle()}>{enabled ? 'Disable demo sign-in' : 'Enable demo sign-in'}</Button>
    </CardContent></Card>
  </div>
}
