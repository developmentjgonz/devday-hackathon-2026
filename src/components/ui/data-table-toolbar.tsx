import { useId, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { SelectField } from './select-field'
import { Text } from './typography'
import { cn } from '@/lib/utils'

export type DataTableToolbarProps = {
  search?: { label: string; placeholder?: string; value: string; onValueChange: (value: string) => void }
  filters?: { id: string; label: string; value: string; options: { value: string; label: string }[]; onValueChange: (value: string) => void }[]
  onReset?: () => void
  actions?: ReactNode
  selection?: { count: number; actions: ReactNode; onClear: () => void }
}

export function DataTableToolbar({ search, filters = [], onReset, actions, selection }: DataTableToolbarProps) {
  const searchId = useId()
  const filterId = useId()
  return <div role="region" aria-label="Table controls" className={cn('flex min-h-(--control-height-sm) flex-wrap items-center gap-3', selection?.count ? 'justify-between' : 'justify-start')}>
    {selection?.count ? <>
      <Text size="small" weight="medium" aria-live="polite">{selection.count} selected</Text>
      <div className="flex flex-wrap items-center gap-2">{selection.actions}<Button variant="ghost" size="sm" onClick={selection.onClear}>Clear selection</Button></div>
    </> : <>
      {search ? <div className="relative w-full sm:w-64">
        <Label htmlFor={searchId} className="sr-only">{search.label}</Label>
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input id={searchId} type="search" controlSize="sm" className="pl-9" placeholder={search.placeholder} value={search.value} onChange={(event) => search.onValueChange(event.target.value)} enterKeyHint="search" />
      </div> : null}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {filters.map((filter) => <div key={filter.id} className="w-44 max-w-full"><Label htmlFor={`${filterId}-${filter.id}`} className="sr-only">{filter.label}</Label>
          <SelectField id={`${filterId}-${filter.id}`} controlSize="sm" value={filter.value} onChange={(event) => filter.onValueChange(event.target.value)}>{filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectField>
        </div>)}
        {onReset ? <Button variant="ghost" size="sm" onClick={onReset}>Clear filters</Button> : null}
      </div>
      {actions ? <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div> : null}
    </>}
  </div>
}
