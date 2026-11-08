import assert from 'node:assert/strict'
import { test } from 'node:test'
import { overviewSummary } from '../../src/features/overview/overview-data.ts'
import type { Report, Task } from '../../shared/types/workspace.ts'

test('overview counts open work and only currently completed tasks inside the last 30 days', () => {
  const now = new Date('2026-11-08T03:00:00.000Z') // November 7 in New York
  const base: Task = { id: '', title: 'Care task', ownerId: 'me', owner: 'Me', due: '', status: 'completed', associations: [] }
  const tasks: Task[] = [
    { ...base, id: 'boundary', completedAt: '2026-10-09T03:00:00.000Z' },
    { ...base, id: 'too-old', completedAt: '2026-10-09T02:59:59.999Z' },
    { ...base, id: 'future', completedAt: '2026-11-08T03:00:00.001Z' },
    { ...base, id: 'unknown' },
    { ...base, id: 'invalid', completedAt: 'not-a-date' },
    { ...base, id: 'team-completed', ownerId: 'other', completedAt: '2026-11-07T10:00:00.000Z' },
    { ...base, id: 'mine-open', status: 'open', due: '2026-11-07', completedAt: '2026-11-07T10:00:00.000Z' },
    { ...base, id: 'team-open', status: 'open', ownerId: 'other', due: '2026-11-06' },
  ]
  const reports = [{ status: 'pending' }, { status: 'waiting' }, { status: 'processed' }] as Report[]
  const summary = overviewSummary(reports, tasks, 'me', now)

  assert.equal(summary.mine.open, 1)
  assert.equal(summary.mine.completed, 1)
  assert.equal(summary.mine.undatedCompleted, 2)
  assert.equal(summary.mine.dueToday, 1)
  assert.equal(summary.mine.overdue, 0)
  assert.equal(summary.team.open, 2)
  assert.equal(summary.team.completed, 2)
  assert.equal(summary.team.undatedCompleted, 2)
  assert.equal(summary.team.overdue, 1)
  assert.deepEqual(summary.recentlyCompleted.map((task) => task.id), ['boundary', 'team-completed'])
  assert.equal(summary.assignees, 2)
  assert.deepEqual(summary.reports, { pending: 1, waiting: 1 })
})

test('members with only completed tasks are not counted as having open work', () => {
  const task: Task = { id: 'done', title: 'Done', ownerId: 'me', owner: 'Me', due: '', status: 'completed', completedAt: '2026-11-07T10:00:00.000Z', associations: [] }
  const summary = overviewSummary([], [task], 'me', new Date('2026-11-08T03:00:00.000Z'))
  assert.equal(summary.mine.open, 0)
  assert.equal(summary.mine.completed, 1)
  assert.equal(summary.assignees, 0)
})
