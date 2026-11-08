import { CatMark } from '@/components/brand-assets'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ChatComposer } from '@/components/ui/chat-composer'
import { Text } from '@/components/ui/typography'
import { Stage, Window, Collapse, type Act } from '../kit'
import { Phone } from '../kit/phone'
import './chat.css'

type Scene = { phase: 'review' | 'sending' | 'filed' }
const initial: Scene = { phase: 'review' }
const poster: Scene = { phase: 'filed' }
async function script(a: Act<Scene>) {
  await a.wait(2000)
  a.mark('confirm')
  await a.click({ at: 'confirm-report', x: 0.9, y: 0.8 })
  a.put({ phase: 'sending' })
  await a.wait(1800)
  a.mark('filed')
  a.put({ phase: 'filed' })
  await a.move({ wide: { x: 610, y: 485 }, compact: { x: 330, y: 485 } })
  await a.wait(4000)
}

export function ReportChatStage() {
  return <div className="report-chat-preview"><Stage width={640} height={540} compact={{ below: 600, width: 358, height: 540 }} initial={initial} poster={poster} script={script} play="once" cursor={{ at: { x: 600, y: 500 } }} className="report-chat-stage">
    {(s, _rect, layout) => layout === 'compact' ? <Phone width={326} frame="bare" className="report-chat-phone">{scene(s)}</Phone> : <Window url="mews.app/report/chat" className="report-chat-window">{scene(s)}</Window>}
  </Stage></div>
}

function scene(s: Scene) {
  return (
      <div className="report-chat-scene">
        <div className="report-chat-thread">
          <div className="flex justify-end"><Card tone="message" size="sm" className="max-w-[85%] will-change-transform"><CardContent><Text size="small">A gray cat is limping near Brickell Library.</Text></CardContent></Card></div>
          <div className="flex items-start gap-3"><CatMark alt="" /><div className="min-w-0 space-y-3"><Text size="caption" weight="semibold">Mews assistant</Text><Text size="small">A gray cat is limping near Brickell Library. Is that right?</Text><Button data-target="confirm-report" data-cursor="pointer" size="sm" className="will-change-transform" loading={s.phase === 'sending'} disabled={s.phase === 'filed'}>Yes, send report</Button></div></div>
          <Collapse open={s.phase === 'filed'} reveal="drop"><div className="flex items-start gap-3"><CatMark alt="" /><Text size="small">Your report has been filed. Thank you for helping the cats!</Text></div></Collapse>
        </div>
        <ChatComposer layout="inline" readOnly={s.phase === 'sending'} value="" onChange={() => {}} onSubmit={(event) => event.preventDefault()} disabled />
      </div>
  )
}
