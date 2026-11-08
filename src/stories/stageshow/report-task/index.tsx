import { useCallback, useEffect, useState } from 'react'
import { MewsWordmark } from '@/components/brand-assets'
import { Button, ButtonLabel } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingIndicator } from '@/components/ui/loading-indicator'
import { SelectField } from '@/components/ui/select-field'
import { Heading, Text } from '@/components/ui/typography'
import { Bar, Collapse, Menu, Popover, Roll, Row, Stage, Text as StageText, useReducedMotion, Window, type Act, type Layout } from '../kit'
import './report-task.css'

type Scene = {
  review: boolean
  dialog: boolean
  choosing: boolean
  assigned: boolean
  task: boolean
  finished: boolean
  tasksView: boolean
}

const initial: Scene = { review: false, dialog: false, choosing: false, assigned: false, task: false, finished: false, tasksView: false }
const poster: Scene = { ...initial, assigned: true, task: true, finished: true, tasksView: true }

async function script(a: Act<Scene>) {
  await a.wait(800)
  a.mark('open-report')
  await a.click({ at: 'report', x: 0.88, y: 0.5 })
  await a.set({ review: true })
  await a.wait(700)

  a.mark('create-task')
  await a.click({ at: 'create-task', x: 0.85, y: 0.55 })
  await a.set({ dialog: true })
  await a.wait(600)
  a.mark('assign')
  await a.click({ at: 'assignee', x: 0.88, y: 0.5 })
  await a.set({ choosing: true })
  a.mark('choose-assignee')
  await a.wait(700)
  await a.click({ at: 'alex', x: 0.8, y: 0.5 })
  await a.set({ choosing: false, assigned: true })
  await a.wait(500)
  a.mark('save-task')
  await a.click({ at: 'save-task', x: 0.85, y: 0.5 })
  await a.set({ dialog: false, task: true })
  a.mark('task-added')
  await a.wait(1100)

  a.mark('finish-review')
  await a.click({ at: 'finish', x: 0.85, y: 0.5 })
  await a.set({ review: false })
  await a.wait(320)
  await a.set({ finished: true })
  await a.wait(650)

  a.mark('my-tasks')
  await a.click({ at: 'my-tasks', x: 0.8, y: 0.5 })
  await a.set({ tasksView: true })
  await a.move({ at: 'task-result', x: 0.9, y: 0.8 })
  await a.wait(2400)
}

const geometry: Record<Layout, {
  window: { left: number; top: number; width: number; height: number }
  review: { left: number; top: number; width: number }
}> = {
  wide: {
    window: { left: 24, top: 24, width: 672, height: 520 },
    review: { left: 310, top: 76, width: 366 },
  },
  compact: {
    window: { left: 16, top: 16, width: 326, height: 570 },
    review: { left: 28, top: 25, width: 302 },
  },
}

export function ReportTaskStage() {
  const [run, setRun] = useState(0)
  const [finished, setFinished] = useState(false)
  const [showPoster, setShowPoster] = useState(false)
  const [fontsReady, setFontsReady] = useState(false)
  const reducedMotion = useReducedMotion()
  useEffect(() => {
    let active = true
    void Promise.allSettled([
      document.fonts.load('600 16px "Fredoka Variable"'),
      document.fonts.load('400 16px "Geist Variable"'),
    ]).then(() => { if (active) setFontsReady(true) })
    return () => { active = false }
  }, [])
  const runScript = useCallback(async (act: Act<Scene>) => {
    setFinished(false)
    await script(act)
    setFinished(true)
  }, [])

  function controlPlayback() {
    if (!finished) {
      setShowPoster(true)
      setFinished(true)
    } else {
      setShowPoster(false)
      setFinished(false)
      setRun((previous) => previous + 1)
    }
  }

  return (
    <div className="report-task-story">
      <div inert aria-hidden="true">
        {fontsReady ? <Stage<Scene>
          key={run}
          width={720}
          height={440}
          compact={{ below: 600, width: 358, height: 340 }}
          initial={initial}
          poster={poster}
          script={showPoster ? undefined : runScript}
          play="once"
          cursor={{ at: { wide: { x: 250, y: 320 }, compact: { x: 300, y: 310 } }, ripple: true }}
          className="mews-stage"
        >
          {(scene, rect, layout) => {
            const g = geometry[layout]
            const assignee = rect('assignee')
            return <>
              <Window url="mews.app" className="mews-stage-window" style={g.window}>
                <div className="mews-stage-header">
                  <MewsWordmark size="sm" />
                  <div className="mews-stage-nav">
                    <Button variant={scene.tasksView ? 'ghost' : 'secondary'} size="sm">Reports</Button>
                    <Button variant={scene.tasksView ? 'secondary' : 'ghost'} size="sm" data-target="my-tasks">My Tasks</Button>
                  </div>
                </div>
                <div className="mews-stage-content">
                  <Heading level={2} size="card"><Roll variant="fade">{scene.tasksView ? 'My Tasks' : 'Reports'}</Roll></Heading>
                  <Text size="caption" tone="muted"><Roll variant="fade">{scene.tasksView ? 'Open tasks' : 'All reports'}</Roll></Text>
                  <div className="mews-stage-views">
                    <div className="mews-stage-view" data-active={!scene.tasksView || undefined}>
                      <Row pad={12} selected={scene.review} data-target="report" data-cursor="pointer" title={<StageText>Possible injury near the feeding station</StageText>} subtitle={<span>Riverside · <Roll>{scene.finished ? 'Reviewed' : 'Needs review'}</Roll></span>} />
                      <Row pad={12} title={<Bar w={165} h={8} />} subtitle={<Bar w={110} h={6} />} />
                      <Row pad={12} title={<Bar w={135} h={8} />} subtitle={<Bar w={90} h={6} />} />
                    </div>
                    <div className="mews-stage-view" data-active={scene.tasksView || undefined}>
                      <Row pad={12} data-target="task-result" title={<StageText>Arrange a care check</StageText>} subtitle={<StageText>Riverside · Open</StageText>} />
                      <Row pad={12} title={<Bar w={165} h={8} />} subtitle={<Bar w={110} h={6} />} />
                      <Row pad={12} title={<Bar w={135} h={8} />} subtitle={<Bar w={90} h={6} />} />
                    </div>
                  </div>
                </div>
              </Window>

              <Popover show={scene.review} origin="top right" className="mews-stage-panel" style={g.review}>
                <div className="mews-stage-panel-view mews-stage-review" data-active={!scene.dialog || undefined}>
                <Heading level={3} size="card">Possible injury near the feeding station</Heading>
                <Text size="caption" tone="muted">Care concern · Urgent · Needs review</Text>
                {layout === 'wide' ? <div className="mews-stage-section mews-stage-original">
                  <Text size="label">Original report</Text>
                  <Text size="small">Pepper was limping near the feeding station.</Text>
                </div> : <Text size="small">Pepper was limping.</Text>}
                <div className="mews-stage-section">
                  <div className="mews-stage-section-heading">
                    <Heading level={4} size="compact"><Roll>{scene.task ? 'Care tasks (1)' : 'Care tasks'}</Roll></Heading>
                    <Button variant="outline" size="sm" data-target="create-task">Create task</Button>
                  </div>
                  <div className="mews-stage-task-space"><Collapse open={scene.task} reveal="drop">
                      <div className="mews-stage-task">
                        <Text size="small" weight="medium">Arrange a care check</Text>
                        <Text size="caption" tone="muted">Open task assigned to Alex Morgan</Text>
                      </div>
                    </Collapse></div>
                </div>
                <div className="mews-stage-footer"><Button size="sm" data-target="finish">Save and finish</Button></div>
                </div>
                <div className="mews-stage-panel-view mews-stage-dialog" data-active={scene.dialog || undefined}>
                <Heading level={3} size="card">Create a care task</Heading>
                <Text size="caption" tone="muted">Assign the next care action.</Text>
                <div className="mews-stage-field">
                  <Text size="label">What needs to happen?</Text>
                  <Input controlSize="sm" value="Arrange a care check" readOnly />
                </div>
                <div className="mews-stage-field">
                  <Text size="label">Assign to</Text>
                  <SelectField controlSize="sm" value={scene.assigned ? 'alex' : ''} onChange={() => {}} data-target="assignee">
                    <option value="">Choose a team member</option>
                    <option value="alex">Alex Morgan</option>
                  </SelectField>
                </div>
                <div className="mews-stage-dialog-actions">
                  <Button variant="outline" size="sm">Cancel</Button>
                  <Button size="sm" data-target="save-task">Create task</Button>
                </div>
                </div>
              </Popover>
              <Popover show={scene.choosing} origin="top left" className="mews-stage-menu" style={{ left: assignee.x, top: assignee.y + assignee.height + 4, width: assignee.width }}>
                <Menu items={['Alex Morgan', 'Maya Rivera']} targets={['alex', undefined]} />
              </Popover>
            </>
          }}
        </Stage> : <div className="mews-stage-loading"><LoadingIndicator label="Loading demonstration" /></div>}
      </div>
      <div className="report-task-story-controls">
        <Text size="small" tone="muted">A report leads to an assigned care task that stays open after review.</Text>
        {!reducedMotion ? <Button variant="outline" size="sm" onClick={controlPlayback}><ButtonLabel labels={['Show result', 'Replay demonstration']}>{finished ? 'Replay demonstration' : 'Show result'}</ButtonLabel></Button> : null}
      </div>
    </div>
  )
}
