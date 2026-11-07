import type { ComponentProps } from 'react'
import { Check, CircleAlert } from 'lucide-react'
import { cn } from 'cn'
import { LoadingIndicator } from './loading-indicator'

export type LoadingStep = { id: string; label: string }
export type LoadingStagesProps = Omit<ComponentProps<'div'>, 'children'> & {
  steps: readonly LoadingStep[]
  /** Zero-based active step. Values outside the list are clamped. */
  currentStep?: number
  status?: 'loading' | 'complete' | 'error'
  label?: string
  paused?: boolean
  errorMessage?: string
}

export function LoadingStages({
  steps,
  currentStep = 0,
  status = 'loading',
  paused = false,
  label = 'Getting things ready',
  errorMessage = 'Something went wrong. Please try again.',
  className,
  ...props
}: LoadingStagesProps) {
  const active = Math.max(
    0,
    Math.min(
      Number.isFinite(currentStep) ? Math.floor(currentStep) : 0,
      steps.length - 1,
    ),
  )
  const finished = status === 'complete'
  const progress = steps.length
    ? finished
      ? 100
      : (active / steps.length) * 100
    : 0
  const announcement =
    steps.length === 0
      ? 'No steps to show'
      : finished
        ? 'All done'
        : status === 'error'
          ? errorMessage
          : `${steps[active].label}. Step ${active + 1} of ${steps.length}.${paused ? ' Paused.' : ''}`

  return (
    <div
      {...props}
      data-slot="loading-stages"
      className={cn('w-full space-y-5', className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{label}</p>
        <span className="text-xs tabular-nums text-muted-foreground">
          {finished ? steps.length : steps.length ? active + 1 : 0} /{' '}
          {steps.length}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-valuetext={announcement}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            'h-full origin-left rounded-full transition-transform duration-(--duration-normal) ease-(--ease-out)',
            status === 'error'
              ? 'bg-destructive'
              : finished
                ? 'bg-success-foreground'
                : 'bg-primary',
          )}
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>
      <ol className="space-y-4" aria-label="Loading steps">
        {steps.map((step, index) => {
          const done = finished || index < active
          const current = !finished && index === active
          return (
            <li
              key={step.id}
              aria-current={current ? 'step' : undefined}
              className={cn(
                'flex items-center gap-3 text-sm',
                !done && !current && 'text-muted-foreground',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full',
                  done
                    ? 'bg-success text-success-foreground'
                    : current
                      ? status === 'error'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-primary/20 text-foreground'
                      : 'border border-border',
                )}
              >
                {done ? (
                  <Check className="size-3.5" />
                ) : current ? (
                  status === 'error' ? (
                    <CircleAlert className="size-4" />
                  ) : (
                    <LoadingIndicator decorative size="sm" paused={paused} />
                  )
                ) : (
                  <span className="text-[10px] tabular-nums">{index + 1}</span>
                )}
              </span>
              <span
                className={cn('min-w-0 break-words', current && 'font-medium')}
              >
                {step.label}
              </span>
              <span className="sr-only">
                {done
                  ? 'Complete'
                  : current
                    ? status === 'error'
                      ? 'Failed'
                      : paused
                        ? 'Paused'
                        : 'In progress'
                    : 'Waiting'}
              </span>
            </li>
          )
        })}
      </ol>
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          status === 'error'
            ? 'text-xs leading-5 text-destructive'
            : steps.length === 0
              ? 'text-xs leading-5 text-muted-foreground'
              : 'sr-only',
        )}
      >
        {announcement}
      </p>
    </div>
  )
}
