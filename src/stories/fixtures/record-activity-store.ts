import type { InboxData } from '@/features/inbox/types'
import type { DirectoryStore } from '@/features/colonies/directory-api'
import type { SessionUser } from '../../../shared/types/auth'
import type { Cat } from '../../../shared/types/directory'
import type { ActivityChange, RecordActivity, RecordType } from '../../../shared/types/record-activity'
import type { Report, Task } from '../../../shared/types/workspace'
import { storyDirectoryStore } from './directory-store'

/** Fictional activity stays in this one Storybook instance. */
export function storyActivityStore(user: SessionUser, initial: InboxData) {
  const cats = new Map(initial.cats.map((cat) => [cat.id, cat]))
  const colonies = new Map(initial.colonies.map((colony) => [colony.id, colony]))
  const entries = new Map<string, RecordActivity[]>()
  const key = (type: RecordType, id: string) => `${type}:${id}`
  function add(targets: { type: RecordType; id: string }[], kind: RecordActivity['kind'], summary: string, changes: ActivityChange[] = [], reportId?: string) {
    const unique = new Map(targets.filter((target) => target.id).map((target) => [key(target.type, target.id), target]))
    for (const [entryKey] of unique) {
      const event: RecordActivity = { id: crypto.randomUUID(), kind, summary, changes, actorName: user.name, occurredAt: new Date().toISOString(), ...(reportId ? { reportId } : {}) }
      entries.set(entryKey, [event, ...(entries.get(entryKey) ?? [])])
    }
  }
  function target(type: RecordType, id: string) { return { type, id } }
  function catTargets(catId: string) {
    const cat = cats.get(catId)
    return cat ? [target('cat', cat.id), target('colony', cat.colonyId)] : []
  }
  function reportTargets(report: Report) { return [target('colony', report.colonyId), target('cat', report.catId)] }
  function taskTargets(task: Task, report: Report | null) {
    return [...(report ? [...reportTargets(report), ...catTargets(report.catId)] : []), ...task.associations.flatMap((item) => item.type === 'cat' ? catTargets(item.id) : item.type === 'colony' ? [target('colony', item.id)] : [])]
  }
  function changed(field: string, before: string, after: string): ActivityChange[] { return before === after ? [] : [{ field, before, after }] }
  function catChanges(before: Cat, after: Cat) {
    return [
      ...changed('Name', before.name, after.name),
      ...changed('Colony', colonies.get(before.colonyId)?.name ?? before.colonyId, colonies.get(after.colonyId)?.name ?? after.colonyId),
      ...changed('Birth date', before.birthDate ?? '', after.birthDate ?? ''),
      ...changed('Birth date type', before.birthDate ? before.birthDateEstimated ? 'Estimated' : 'Exact' : '', after.birthDate ? after.birthDateEstimated ? 'Estimated' : 'Exact' : ''),
      ...changed('Details', before.description ?? '', after.description ?? ''),
      ...(before.photoUrl !== after.photoUrl ? [{ field: 'Photo', before: before.photoUrl ? 'Existing photo' : '', after: after.photoUrl ? 'New photo' : '' }] : []),
    ]
  }
  const directory: DirectoryStore = {
    async getActivity(type, id) { return structuredClone(entries.get(key(type, id)) ?? []) },
    async addColony(...args) { const colony = await storyDirectoryStore.addColony(...args); colonies.set(colony.id, colony); add([target('colony', colony.id)], 'profile', 'Colony created'); return colony },
    async updateColonyLocation(...args) { const colony = await storyDirectoryStore.updateColonyLocation(...args); const previous = args[0]; colonies.set(colony.id, colony); if (JSON.stringify([previous.coordinates, previous.address, previous.googlePlaceId]) !== JSON.stringify([colony.coordinates, colony.address, colony.googlePlaceId])) add([target('colony', colony.id)], 'profile', 'Location updated'); return colony },
    async addCat(...args) { const cat = await storyDirectoryStore.addCat(...args); cats.set(cat.id, cat); add([target('cat', cat.id)], 'profile', 'Cat created'); add([target('colony', cat.colonyId)], 'profile', `Cat added: ${cat.name}`); return cat },
    async updateCat(cat, input) {
      const updated = await storyDirectoryStore.updateCat(cat, input)
      const changes = catChanges(cat, updated)
      if (changes.length) {
        add([target('cat', cat.id)], 'profile', 'Cat profile updated', changes)
        add([target('colony', cat.colonyId)], 'profile', cat.colonyId === updated.colonyId ? `Cat profile updated: ${updated.name}` : `Cat moved out: ${cat.name}`)
        if (cat.colonyId !== updated.colonyId) add([target('colony', updated.colonyId)], 'profile', `Cat moved in: ${updated.name}`)
      }
      cats.set(updated.id, updated)
      return updated
    },
    async changeCatColony(cat, colonyId) {
      const current = cats.get(cat.id)
      if (!current || current.colonyId !== cat.colonyId) throw new Error("The cat's colony changed. Reload and try again.")
      const updated = await storyDirectoryStore.changeCatColony(current, colonyId)
      const changes = catChanges(current, updated)
      if (changes.length) {
        add([target('cat', current.id)], 'profile', 'Cat profile updated', changes)
        add([target('colony', current.colonyId)], 'profile', `Cat moved out: ${current.name}`)
        add([target('colony', updated.colonyId)], 'profile', `Cat moved in: ${updated.name}`)
      }
      cats.set(updated.id, updated)
      return updated
    },
  }
  return {
    directory,
    report(summary: string, report: Report, before?: Report) { add([...(before ? reportTargets(before) : []), ...reportTargets(report)], 'report', summary, [], report.id) },
    task(summary: string, task: Task, report: Report | null, before?: Task) {
      const describe = (item: Task) => item.associations.map((link) => 'label' in link ? `${link.type}: ${link.label}` : link.type === 'cat' ? `cat: ${cats.get(link.id)?.name ?? link.id}` : `colony: ${colonies.get(link.id)?.name ?? link.id}`).join(', ')
      const changes = before ? [
        ...changed('Title', before.title, task.title), ...changed('Assignee', before.owner, task.owner),
        ...changed('Due date', before.due, task.due), ...changed('Status', before.status === 'open' ? 'Open' : 'Completed', task.status === 'open' ? 'Open' : 'Completed'),
        ...(task.status === 'completed' && before.status !== task.status && task.completionNote ? [{ field: 'Completion note', before: '', after: task.completionNote }] : []),
        ...changed('Related items', describe(before), describe(task)),
      ] : []
      if (before && !changes.length) return
      add([...taskTargets(task, report), ...(before ? taskTargets(before, report) : [])], 'task', summary, changes, task.reportId)
    },
  }
}

export type StoryActivityStore = ReturnType<typeof storyActivityStore>
