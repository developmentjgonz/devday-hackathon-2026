import { useState } from 'react'
import { ArrowRight, Plus } from 'lucide-react'
import { Button, ButtonLabel } from '@/components/ui/button'
import { AccountButton } from '@/components/ui/account-button'
import { RecordButton } from '@/components/ui/record-button'
import catMarkUrl from '@/assets/mews-cat.svg'

const labels = ['Save visit', 'Saving feeding visit', 'Visit saved']

export function ButtonStateDemo() {
  const [state, setState] = useState(0)
  const loading = state === 1
  const label = <ButtonLabel labels={labels}>{labels[state]}</ButtonLabel>

  return (
    <div className="w-full max-w-xl space-y-6">
      <Button variant="outline" onClick={() => setState((value) => (value + 1) % 3)}>
        Next state
      </Button>
      <p role="status">{['Ready', 'Loading', 'Complete'][state]}</p>
      <div className="grid gap-4">
        {(['xs', 'sm', 'default', 'lg'] as const).map((size) => (
          <div key={size} role="group" aria-label={`${size} button`}>
            <Button size={size} loading={loading}>{label}</Button>
          </div>
        ))}
        <div role="group" aria-label="Leading icon button">
          <Button variant="outline" loading={loading}><Plus aria-hidden="true" />{label}</Button>
        </div>
        <div role="group" aria-label="Trailing icon button">
          <Button variant="secondary" loading={loading}>{label}<ArrowRight aria-hidden="true" /></Button>
        </div>
        <div role="group" aria-label="Plain loading button">
          <Button loading={loading}>Check access</Button>
        </div>
        <div role="group" aria-label="Icon loading button">
          <Button variant="ghost" loading={loading}><Plus aria-hidden="true" />Sign out</Button>
        </div>
        <div role="group" aria-label="Link button">
          <Button variant="link" render={<a href="#visit" />} loading={loading}>{label}</Button>
        </div>
        {(['icon-xs', 'icon-sm', 'icon', 'icon-lg'] as const).map((size) => (
          <div key={size} role="group" aria-label={`${size} button`}>
            <Button size={size} aria-label="Add visit" loading={loading}><Plus aria-hidden="true" /></Button>
          </div>
        ))}
        <div role="group" aria-label="Full width button">
          <Button className="w-full" loading={loading}>{label}</Button>
        </div>
        <div role="group" aria-label="Record button">
          <RecordButton className="w-full" title="Canal colony" description="Morning feeding visit" icon={<ArrowRight aria-hidden="true" />} loading={loading} />
        </div>
        <div role="group" aria-label="Account button">
          <AccountButton name="Maya Rivera" description="Administrator" loading={loading} />
        </div>
        <div role="group" aria-label="Media button">
          <Button variant="media" size="media" aria-label="Open cat artwork" loading={loading}>
            <img src={catMarkUrl} alt="Mews cat mark" className="h-32 w-40 object-contain" />
          </Button>
        </div>
      </div>
    </div>
  )
}
