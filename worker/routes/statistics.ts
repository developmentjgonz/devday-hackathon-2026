import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Cat, Colony } from '../../shared/types/directory.ts'
import type { StatisticsSnapshot } from '../../shared/types/statistics.ts'
import { statisticsFor } from '../../shared/statistics.ts'
import { requireActiveUser, requireAdministrator } from '../middleware/auth.ts'
import type { AppEnv } from '../types.ts'

export const statisticsRoutes = new Hono<AppEnv>()
statisticsRoutes.use('*', requireActiveUser, requireAdministrator)

async function snapshot(db: D1Database): Promise<StatisticsSnapshot> {
  // D1 batches run in one transaction, so both lists describe the same state.
  const [colonies, cats] = await db.batch([
    db.prepare('SELECT id, name FROM colonies ORDER BY name COLLATE NOCASE, id'),
    db.prepare(`SELECT id, name, COALESCE(colony_id, '') AS colonyId, birth_date AS birthDate,
      birth_date_estimated AS birthDateEstimated, description FROM cats ORDER BY name COLLATE NOCASE, id`),
  ])
  const catRows = cats!.results as (Omit<Cat, 'birthDate' | 'birthDateEstimated'> & { birthDate: string | null; birthDateEstimated: number })[]
  return {
    colonies: colonies!.results as Colony[],
    cats: catRows.map(({ birthDate, birthDateEstimated, ...cat }) => ({ ...cat, ...(birthDate ? { birthDate, birthDateEstimated: Boolean(birthDateEstimated) } : {}) })),
    asOf: new Date().toISOString(),
  }
}

// Quote every field and neutralize spreadsheet formulas, including after whitespace.
function csv(rows: (string | number)[][]) {
  return '\uFEFF' + rows.map((row) => row.map((value) => {
    const text = String(value)
    const safe = /^[\s\uFEFF]*[=+@-]/u.test(text) ? `'${text}` : text
    return `"${safe.replaceAll('"', '""')}"`
  }).join(',')).join('\r\n') + '\r\n'
}

statisticsRoutes.get('/', async (c) => c.json(await snapshot(c.env.DB)))
statisticsRoutes.get('/export', async (c) => {
  const kind = c.req.query('kind')
  if (kind !== 'summary' && kind !== 'cats') throw new HTTPException(400, { message: 'Choose a summary or cat records export.' })
  const data = await snapshot(c.env.DB)
  const colonyId = c.req.query('colonyId') ?? ''
  if (colonyId && !data.colonies.some((colony) => colony.id === colonyId)) throw new HTTPException(404, { message: 'The colony was not found. Refresh the page and try again.' })
  const stats = statisticsFor(data, colonyId)
  const colonyNames = new Map(data.colonies.map((colony) => [colony.id, colony.name]))
  const rows: (string | number)[][] = kind === 'summary' ? [
    ['As of (UTC)', 'Group', 'Colony ID', 'Colony', 'Registered cats', 'Colonies', 'Cats without a colony'],
    [data.asOf, 'Total', '', colonyId ? colonyNames.get(colonyId)! : 'All colonies', stats.registeredCats, stats.colonyCount, stats.withoutColony],
    ...stats.colonies.map((colony) => [data.asOf, 'Colony', colony.id, colony.name, colony.catCount, 1, 0]),
    ...(!colonyId ? [[data.asOf, 'Without a colony', '', '', stats.withoutColony, 0, stats.withoutColony]] : []),
  ] : [
    ['As of (UTC)', 'Cat ID', 'Cat name', 'Colony ID', 'Colony', 'Birth date', 'Birth date estimated', 'Description'],
    ...stats.cats.map((cat) => [data.asOf, cat.id, cat.name, cat.colonyId, colonyNames.get(cat.colonyId) ?? '', cat.birthDate ?? '', cat.birthDate ? cat.birthDateEstimated ? 'Yes' : 'No' : '', cat.description ?? '']),
  ]
  c.header('Content-Type', 'text/csv; charset=utf-8')
  c.header('Content-Disposition', `attachment; filename="mews-${kind}-${data.asOf.slice(0, 10)}.csv"`)
  c.header('X-Content-Type-Options', 'nosniff')
  return c.body(csv(rows))
})
