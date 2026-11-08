import { Pause, Play } from 'lucide-react'
import { Button, ButtonLabel } from '@/components/ui/button'

export function AnimationPlaybackButton({
  paused,
  onClick,
}: {
  paused: boolean
  onClick: () => void
}) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
      <ButtonLabel labels={['Pause animation', 'Resume animation']}>
        {paused ? 'Resume animation' : 'Pause animation'}
      </ButtonLabel>
    </Button>
  )
}
