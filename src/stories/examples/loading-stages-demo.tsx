import { useEffect, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { Button, ButtonLabel } from '@/components/ui/button'
import { LoadingStages } from '@/components/ui/loading-stages'

export const careSteps = [
  { id: 'visit', label: 'Saving visit details' },
  { id: 'photos', label: 'Uploading visit photos' },
  { id: 'history', label: 'Updating colony history' },
]

export function LoadingStagesDemo() {
  const [stage, setStage] = useState(0)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(false)
  const complete = stage >= careSteps.length

  useEffect(() => {
    if (!running || error || complete) return
    const timeout = window.setTimeout(() => {
      if (stage >= careSteps.length - 1) setRunning(false)
      setStage((previous) => previous + 1)
    }, 1400)
    return () => window.clearTimeout(timeout)
  }, [running, stage, error, complete])

  function play() {
    if (complete) setStage(0)
    setError(false)
    setRunning(true)
  }

  function reset() {
    setRunning(false)
    setError(false)
    setStage(0)
  }
  function fail() {
    setRunning(false)
    setError(true)
  }

  return (
    <div className="w-full space-y-5">
      <div className="min-h-60">
        <LoadingStages
          steps={careSteps}
          currentStep={stage}
          status={error ? 'error' : complete ? 'complete' : 'loading'}
          paused={!running}
          label={
            complete
              ? 'Visit saved'
              : error
                ? 'Could not save visit'
                : 'Saving feeding visit'
          }
          errorMessage="Could not save this visit. Select Retry to continue from this step."
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <Button
          size="sm"
          onClick={running ? () => setRunning(false) : play}
        >
          {running ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          <ButtonLabel labels={['Save visit', 'Pause', 'Retry', 'Replay', 'Resume']}>
            {running
              ? 'Pause'
              : error
                ? 'Retry'
                : complete
                  ? 'Replay'
                  : stage > 0
                    ? 'Resume'
                    : 'Save visit'}
          </ButtonLabel>
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={complete || error}
          onClick={() => {
            setRunning(false)
            setStage((previous) => previous + 1)
          }}
        >
          Next step
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={complete || error}
          onClick={fail}
        >
          Simulate error
        </Button>
        <Button size="sm" variant="ghost" onClick={reset}>
          <RotateCcw aria-hidden="true" />
          Reset
        </Button>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Canal colony · Morning feeding with two visit photos. Playback uses
        sample state; no visit is sent.
      </p>
    </div>
  )
}
