import { useState, type CSSProperties } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { LoadingIndicator } from '@/components/ui/loading-indicator'
import { Heading, Text } from '@/components/ui/typography'
import { AnimationPlaybackButton } from './animation-playback-button'

export function LoaderMotionDemo() {
  const [paused, setPaused] = useState(false)
  const [slow, setSlow] = useState(false)

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-8">
      <div>
        <Heading level={1} size="section">Cat-print motion</Heading>
        <Text size="small" tone="muted" className="mt-2">The shared loader on its own and inside loading buttons.</Text>
      </div>
      <div className="flex flex-wrap items-center gap-5">
        <AnimationPlaybackButton paused={paused} onClick={() => setPaused((value) => !value)} />
        <Label className="flex items-center gap-2">
          <Checkbox checked={slow} onCheckedChange={(checked) => setSlow(checked === true)} />
          Slow motion · ⅓ speed
        </Label>
      </div>
      <div
        className="grid gap-8 border-t pt-6 sm:grid-cols-2"
        style={{
          '--loader-play-state': paused ? 'paused' : 'running',
          '--loader-playback-duration': slow ? 'calc(var(--duration-loading) * 3)' : undefined,
        } as CSSProperties}
      >
        <section aria-labelledby="standalone-loader-title" className="space-y-6">
          <Heading size="card" id="standalone-loader-title">Standalone</Heading>
          <div className="flex min-h-24 items-center"><LoadingIndicator size="lg" label="Loading colony updates" /></div>
          <div className="flex items-center gap-3">
            <LoadingIndicator size="sm" decorative />
            <Text size="small" tone="muted">Compact loader</Text>
          </div>
        </section>
        <section aria-labelledby="button-loader-title" className="space-y-6">
          <Heading size="card" id="button-loader-title">Inside a button</Heading>
          <div className="flex min-h-24 flex-wrap items-center gap-3">
            <Button loading>Saving visit</Button>
            <Button loading variant="outline">Updating care</Button>
          </div>
          <Text size="small" tone="muted">Actions stay disabled while loading. Button sizes stay fixed.</Text>
        </section>
      </div>
      <Text size="small" tone="muted">Reduced motion keeps the paw still. These examples do not send data.</Text>
    </div>
  )
}
