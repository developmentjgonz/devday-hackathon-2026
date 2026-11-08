import { HTTPException } from 'hono/http-exception'
import type { DuplicateReport, DuplicateSearchResult } from '../../shared/types/workspace.ts'

const pageSize = 15
const stopWords = new Set('about after again also and are at been by can cat cats did for from had has have her him his into its near not of on our report she some that the their there this was were what with you your'.split(' '))

// Quote every token so user text cannot become an FTS query operator.
function searchTerms(value: string, join: ' AND ' | ' OR ', max: number): string {
  const words = value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
  return [...new Set(words)].filter((word) => word.length >= 2 && (join === ' AND ' || !stopWords.has(word))).slice(0, max).map((word) => `"${word}"*`).join(join)
}

async function sourceReport(db: D1Database, id: string) {
  const report = await db.prepare(`SELECT id, title, message, colony_id AS colonyId, cat_id AS catId, status,
    EXISTS(SELECT 1 FROM reports linked WHERE linked.duplicate_of = reports.id) AS hasIncoming
    FROM reports WHERE id = ?`).bind(id).first<{ id: string; title: string; message: string; colonyId: string | null; catId: string | null; status: string; hasIncoming: number }>()
  if (!report) throw new HTTPException(404, { message: 'Report not found.' })
  return report
}

const columns = `r.id, r.title, r.message, COALESCE(u.name, 'Anonymous') AS reporter,
  r.submitted_at AS submittedAt, COALESCE(c.name, '') AS cat`
const joins = 'LEFT JOIN users u ON u.id = r.reporter_id LEFT JOIN cats c ON c.id = r.cat_id'

export async function searchDuplicateReports(db: D1Database, id: string, query: string, offset: number): Promise<DuplicateSearchResult> {
  const source = await sourceReport(db, id)
  if (!source.colonyId || source.status === 'processed' || source.hasIncoming) return { reports: [], hasMore: false }
  const term = searchTerms(query, ' AND ', 12)
  if (query.trim() && !term) return { reports: [], hasMore: false }
  const result = term
    ? await db.prepare(`SELECT ${columns} FROM report_search JOIN reports r ON r.rowid = report_search.rowid ${joins}
      WHERE report_search MATCH ? AND r.colony_id = ? AND r.id <> ? AND r.duplicate_of IS NULL
      ORDER BY bm25(report_search), r.submitted_at DESC, r.id LIMIT ? OFFSET ?`).bind(term, source.colonyId, id, pageSize + 1, offset).all<DuplicateReport>()
    : await db.prepare(`SELECT ${columns} FROM reports r ${joins}
      WHERE r.colony_id = ? AND r.id <> ? AND r.duplicate_of IS NULL
      ORDER BY r.submitted_at DESC, r.id LIMIT ? OFFSET ?`).bind(source.colonyId, id, pageSize + 1, offset).all<DuplicateReport>()
  return { reports: result.results.slice(0, pageSize), hasMore: result.results.length > pageSize }
}

export async function analysisDuplicateCandidates(db: D1Database, id: string): Promise<DuplicateReport[]> {
  const source = await sourceReport(db, id)
  if (!source.colonyId || source.status === 'processed' || source.hasIncoming) return []
  const term = searchTerms(`${source.title} ${source.message}`, ' OR ', 16)
  const textMatches = term ? db.prepare(`SELECT ${columns} FROM report_search JOIN reports r ON r.rowid = report_search.rowid ${joins}
    WHERE report_search MATCH ? AND r.colony_id = ? AND r.id <> ? AND r.duplicate_of IS NULL
    ORDER BY bm25(report_search), r.submitted_at DESC, r.id LIMIT 15`).bind(term, source.colonyId, id).all<DuplicateReport>() : Promise.resolve({ results: [] as DuplicateReport[] })
  const sameCat = source.catId ? db.prepare(`SELECT ${columns} FROM reports r ${joins}
    WHERE r.cat_id = ? AND r.colony_id = ? AND r.id <> ? AND r.duplicate_of IS NULL
    ORDER BY r.submitted_at DESC, r.id LIMIT 10`).bind(source.catId, source.colonyId, id).all<DuplicateReport>() : Promise.resolve({ results: [] as DuplicateReport[] })
  const [matched, catMatches] = await Promise.all([textMatches, sameCat])
  const unique = new Map<string, DuplicateReport>()
  for (const candidate of [...matched.results, ...catMatches.results]) unique.set(candidate.id, candidate)
  return [...unique.values()].slice(0, 20)
}
