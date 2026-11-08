import { useId } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { Heading, Text } from '@/components/ui/typography'
import type { InboxData, TaskAssociation } from '@/features/inbox/types'

const labels = { cat: 'Cat', colony: 'Colony', person: 'Person', paperwork: 'Paperwork', other: 'Other' } as const
export function associationLabel(item: TaskAssociation, data: Pick<InboxData, 'cats' | 'colonies'>) {
  if (item.type === 'cat') return data.cats.find((cat) => cat.id === item.id)?.name ?? 'Cat unavailable'
  if (item.type === 'colony') return data.colonies.find((colony) => colony.id === item.id)?.name ?? 'Colony unavailable'
  return 'label' in item ? item.label : ''
}

export type AssociationDraft = { type: TaskAssociation['type']; entry: string }
export function emptyAssociationDraft(): AssociationDraft { return { type: 'cat', entry: '' } }
export function pendingAssociation(draft: AssociationDraft, value: TaskAssociation[], data: Pick<InboxData, 'cats' | 'colonies'>): TaskAssociation | null {
  const { type } = draft
  const entry = draft.entry.trim()
  if (!entry || value.length >= 30) return null
  if (value.some((item) => item.type === type && ('id' in item ? item.id === entry : item.label.toLocaleLowerCase() === entry.toLocaleLowerCase()))) return null
  if (type === 'cat') return data.cats.some((item) => item.id === entry) ? { type, id: entry } : null
  if (type === 'colony') return data.colonies.some((item) => item.id === entry) ? { type, id: entry } : null
  return { type, label: entry }
}

export function TaskAssociations({ value, onChange, data, draft, onDraftChange, disabled = false }: { disabled?: boolean; value: TaskAssociation[]; onChange: (next: TaskAssociation[]) => void; data: Pick<InboxData, 'cats' | 'colonies'>; draft: AssociationDraft; onDraftChange: (draft: AssociationDraft) => void }) {
  const { type, entry } = draft
  const typeId = useId()
  const entryId = useId()
  const pending = pendingAssociation(draft, value, data)
  function add() {
    if (!pending) return
    onChange([...value, pending])
    onDraftChange({ ...draft, entry: '' })
  }
  return <section className="space-y-3" aria-labelledby={`${typeId}-heading`}>
    <Heading id={`${typeId}-heading`} level={3} size="compact">Related items (optional)</Heading>
    {value.length ? <ul className="space-y-1">{value.map((item, index) => <li key={`${item.type}-${'id' in item ? item.id : item.label}`} className="flex items-center justify-between gap-2">
      <Text size="small" className="wrap-anywhere">{labels[item.type]}: {associationLabel(item, data)}</Text>
      <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${labels[item.type].toLocaleLowerCase()}: ${associationLabel(item, data)}`}><X aria-hidden="true" />Remove</Button>
    </li>)}</ul> : null}
    {value.length < 30 ? <><div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-2"><Label htmlFor={typeId}>Item type</Label><SelectField id={typeId} disabled={disabled} value={type} onChange={(event) => { onDraftChange({ type: event.target.value as TaskAssociation['type'], entry: '' }) }}>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</SelectField></div>
      <div className="grid gap-2"><Label htmlFor={entryId}>{type === 'cat' || type === 'colony' ? `Choose ${labels[type].toLocaleLowerCase()}` : `${labels[type]} name`}</Label>
        {type === 'cat' || type === 'colony' ? <SelectField id={entryId} disabled={disabled} value={entry} onChange={(event) => onDraftChange({ ...draft, entry: event.target.value })}><option value="">Choose {labels[type].toLocaleLowerCase()}</option>{(type === 'cat' ? data.cats : data.colonies).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
          : <Input id={entryId} disabled={disabled} maxLength={120} value={entry} onChange={(event) => onDraftChange({ ...draft, entry: event.target.value })} />}
      </div>
    </div>
    <Button type="button" size="sm" variant="outline" disabled={disabled || !pending} onClick={add}><Plus aria-hidden="true" />Add related item</Button></> : <Text size="caption" tone="muted">You can add up to 30 related items.</Text>}
  </section>
}
