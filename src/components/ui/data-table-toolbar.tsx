import { useId, useRef, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { SelectField } from './select-field'
import { Text } from './typography'
import { cn } from '@/lib/utils'

export type DataTableToolbarProps = {
  label?: string
  search?: { label: string; placeholder?: string; value: string; onValueChange: (value: string) => void }
  filters?: { id: string; label: string; value: string; options: { value: string; label: string }[]; onValueChange: (value: string) => void }[]
  onReset?: () => void
  /** Keep the reset position stable while no filters can be cleared. */
  resetActive?: boolean
  actions?: ReactNode
  selection?: { count: number; actions: ReactNode; onClear: () => void; busy?: boolean }
}

export function DataTableToolbar({ label = 'Table controls', search, filters = [], onReset, resetActive = true, actions, selection }: DataTableToolbarProps) {
  const searchId = useId()
  const filterId = useId()
  const searchRef = useRef<HTMLInputElement>(null)
  const selected = Boolean(selection?.count)
  const filterControl = (filter: NonNullable<DataTableToolbarProps['filters']>[number]) => <div key={filter.id} className="w-44 min-w-0 max-w-full shrink"><Label htmlFor={`${filterId}-${filter.id}`} className="sr-only">{filter.label}</Label>
    <SelectField id={`${filterId}-${filter.id}`} controlSize="sm" disabled={selected} value={filter.value} onChange={(event) => filter.onValueChange(event.target.value)}>{filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectField>
  </div>
  const earlierFilters = filters.slice(0, -1)
  const lastFilter = filters.at(-1)
  return <div role="region" aria-label={label} className="flex min-h-(--control-height-sm) flex-wrap items-center gap-3">
    {search ? <div className="grid w-full sm:w-64">
      <div className={cn('relative col-start-1 row-start-1', selected && 'invisible')} inert={selected || undefined}>
        <Label htmlFor={searchId} className="sr-only">{search.label}</Label>
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input ref={searchRef} id={searchId} type="search" controlSize="sm" className="pl-9" placeholder={search.placeholder} value={search.value} onChange={(event) => search.onValueChange(event.target.value)} enterKeyHint="search" />
      </div>
      {selection ? <div className={cn('col-start-1 row-start-1 flex items-center', !selected && 'invisible')}><Text size="small" weight="medium" aria-live="polite">{selection.count} selected</Text></div> : null}
    </div> : selected ? <Text size="small" weight="medium" aria-live="polite">{selection?.count} selected</Text> : null}
    {filters.length || onReset ? <div className="flex min-w-0 max-w-full flex-col items-start gap-2 sm:flex-row sm:items-center">
      {earlierFilters.map(filterControl)}
      <div className="flex min-w-0 max-w-full items-center gap-2">
        {lastFilter ? filterControl(lastFilter) : null}
        {onReset ? <Button variant="ghost" size="sm" className={resetActive ? undefined : 'invisible'} disabled={selected || !resetActive} onClick={() => { onReset(); searchRef.current?.focus({ preventScroll: true }) }}>Clear filters</Button> : null}
      </div>
    </div> : null}
    {actions || selection ? <div className="ml-auto grid min-w-0 max-w-full">
      {actions ? <div className={cn('col-start-1 row-start-1 flex flex-wrap items-center justify-end gap-2', selected && 'invisible')} inert={selected || undefined}>{actions}</div> : null}
      {selection ? <div className={cn('col-start-1 row-start-1 flex flex-wrap items-center justify-end gap-2', !selected && 'invisible')} inert={!selected || undefined}>
        {selection.actions}<Button variant="ghost" size="sm" disabled={selection.busy} onClick={() => { selection.onClear(); requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true })) }}>Clear selection</Button>
      </div> : null}
    </div> : null}
  </div>
}
