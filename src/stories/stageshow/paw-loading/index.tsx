import { LoadingIndicator } from '@/components/ui/loading-indicator'
import { Stage, Window, type Act } from '../kit'
import './paw-loading.css'

type Scene = Record<string, never>
const scene: Scene = {}

async function hold(a: Act<Scene>) {
  await a.wait(2400)
}

export function PawLoadingStage() {
  return (
    <div className="paw-stage-story">
      <Stage<Scene>
        width={600}
        height={400}
        compact={{ below: 600, width: 358, height: 340 }}
        initial={scene}
        poster={scene}
        script={hold}
        className="paw-stage"
      >
        {() => (
          <Window url="mews.app" className="paw-stage-window">
            <div className="paw-stage-screen">
              <LoadingIndicator size="xl" tone="brand" label="Opening Mews" />
            </div>
          </Window>
        )}
      </Stage>
    </div>
  )
}
