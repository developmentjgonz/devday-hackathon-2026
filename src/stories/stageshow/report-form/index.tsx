import { MemoryRouter } from 'react-router'
import { PublicReportForm } from '@/features/public-reports/components/public-report-form'
import { Text } from '@/components/ui/typography'
import { Stage, Window, type Act } from '../kit'
import { Phone } from '../kit/phone'
import './form.css'

type Scene = { phase: 'ready' | 'sending' | 'sent' }
const initial: Scene = { phase: 'ready' }
const poster: Scene = { phase: 'sent' }
async function script(a: Act<Scene>) {
  await a.wait(1500)
  a.mark('send')
  await a.click({ at: 'public-report-send', x: 0.9, y: 0.8 })
  a.put({ phase: 'sending' })
  await a.wait(1800)
  a.mark('sent')
  a.put({ phase: 'sent' })
  await a.wait(3000)
}
function scene(s: Scene) {
  return <div className="report-form-scene"><Text size="label">Tell us about a cat</Text><PublicReportForm initial={{ location: 'Brickell Library, Miami', details: 'A gray cat is resting by the door.', urgent: false }} busy={s.phase === 'sending'} submitted={s.phase === 'sent'} error="" onSubmit={() => {}} /></div>
}
export function ReportFormStage() {
  return <MemoryRouter><div className="report-form-preview"><Stage width={800} height={720} compact={{ below: 600, width: 358, height: 740 }} initial={initial} poster={poster} script={script} play="once" cursor={{ at: { wide: { x: 600, y: 700 }, compact: { x: 330, y: 700 } } }} className="report-form-stage">
    {(s, _rect, layout) => layout === 'compact' ? <Phone width={326} frame="bare" className="report-form-phone">{scene(s)}</Phone> : <Window url="mews.app/report" className="report-form-window">{scene(s)}</Window>}
  </Stage></div></MemoryRouter>
}
