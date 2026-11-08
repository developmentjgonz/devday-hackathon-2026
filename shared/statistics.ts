import type { StatisticsSnapshot } from './types/statistics.ts'

export function statisticsFor(snapshot: StatisticsSnapshot, colonyId = '') {
  const colonies = colonyId ? snapshot.colonies.filter((colony) => colony.id === colonyId) : snapshot.colonies
  const cats = colonyId ? snapshot.cats.filter((cat) => cat.colonyId === colonyId) : snapshot.cats
  const counts = new Map<string, number>()
  for (const cat of cats) counts.set(cat.colonyId, (counts.get(cat.colonyId) ?? 0) + 1)
  return {
    cats,
    colonies: colonies.map((colony) => ({ ...colony, catCount: counts.get(colony.id) ?? 0 })),
    registeredCats: cats.length,
    colonyCount: colonies.length,
    withoutColony: counts.get('') ?? 0,
  }
}
