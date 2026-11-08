import { Disclosure } from '@/components/ui/disclosure'
import { DrawerContext, DrawerContextValue } from '@/components/ui/drawer'
import { Text } from '@/components/ui/typography'
import type { TaskRecordContext } from '../task-data'

export function TaskRecordContextSummary({ context }: { context: TaskRecordContext }) {
  const { colonies, cats, emptyColony } = context
  return <DrawerContext>
    <DrawerContextValue label={colonies.length > 1 ? 'Colonies' : 'Colony'} value={colonies.join(', ') || emptyColony} maxLines={colonies.length > 1 ? 2 : undefined} />
    <DrawerContextValue label={cats.length > 1 ? 'Cats' : 'Cat (optional)'} value={cats.join(', ') || 'No cat'} maxLines={cats.length > 1 ? 2 : undefined} />
  </DrawerContext>
}

export function TaskRecordContextDetails({ context }: { context: TaskRecordContext }) {
  const { colonies, cats } = context
  if (colonies.length <= 1 && cats.length <= 1) return null
  return <Disclosure title="All linked cats and colonies">
    {colonies.length ? <Text size="small" className="wrap-anywhere">Colonies: {colonies.join(', ')}</Text> : null}
    {cats.length ? <Text size="small" className="wrap-anywhere">Cats: {cats.join(', ')}</Text> : null}
  </Disclosure>
}
