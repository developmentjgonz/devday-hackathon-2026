import { useId, useState, type CSSProperties } from 'react'
import {
  LoadingIndicator,
  type LoadingIndicatorProps,
} from '@/components/ui/loading-indicator'
import { AnimationPlaybackButton } from './animation-playback-button'

export function LoadingIndicatorDemo() {
  const id = useId()
  const [size, setSize] = useState<LoadingIndicatorProps['size']>('lg')
  const [paused, setPaused] = useState(false)
  const [slow, setSlow] = useState(false)

  return (
    <div className="space-y-5">
      <div
        className="flex min-h-36 items-center justify-center rounded-control border bg-background"
        style={
          {
            '--loader-playback-duration': slow
              ? 'calc(var(--duration-loading) * 3)'
              : undefined,
          } as CSSProperties
        }
      >
        <LoadingIndicator
          size={size}
          paused={paused}
          label={paused ? 'Colony updates paused' : 'Loading colony updates'}
        />
      </div>
      <div>
        <div className="space-y-1.5 text-xs font-medium">
          <label htmlFor={`${id}-size`}>Size</label>
          <select
            id={`${id}-size`}
            value={size}
            onChange={(event) =>
              setSize(event.target.value as LoadingIndicatorProps['size'])
            }
            className="h-(--control-height) w-full rounded-control border border-input bg-background px-4 text-base sm:text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="sm">Small · 16 px</option>
            <option value="md">Medium · 24 px</option>
            <option value="lg">Large · 40 px</option>
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <AnimationPlaybackButton
          paused={paused}
          onClick={() => setPaused((previous) => !previous)}
        />
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={slow}
            onChange={(event) => setSlow(event.target.checked)}
            className="size-4 accent-primary"
          />
          Slow motion · ⅓ speed
        </label>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Shared single-paw pulse. Static when reduced motion is enabled.
      </p>
    </div>
  )
}
