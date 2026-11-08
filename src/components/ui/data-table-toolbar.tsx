import { useId, useRef, type ReactNode } from 'react'
import { ListFilter, Search } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { Popover, PopoverClose, PopoverContent, PopoverTitle, PopoverTrigger } from './popover'
import { SelectField } from './select-field'
import { Text } from './typography'
import { cn } from '@/lib/utils'

export type DataTableToolbarProps = {
  label?: string
  search?: { label: string; placeholder?: string; value: string; onValueChange: (value: string) => void }
  filters?: { id: string; label: string; displayLabel?: string; value: string; active?: boolean; width?: 'default' | 'wide'; options: { value: string; label: string }[]; onValueChange: (value: string) => void }[]
  filterPresentation?: 'inline' | 'popover'
  onReset?: () => void
  /** Keep the reset position stable while no filters can be cleared. */
  resetActive?: boolean
  actions?: ReactNode
  selection?: { count: number; actions: ReactNode; onClear: () => void; busy?: boolean }
}

export function DataTableToolbar({ label = 'Table controls', search, filters = [], filterPresentation = 'inline', onReset, resetActive = true, actions, selection }: DataTableToolbarProps) {
  const searchId = useId()
  const filterId = useId()
  const searchRef = useRef<HTMLInputElement>(null)
  const filterPopupRef = useRef<HTMLDivElement>(null)
  const selected = Boolean(selection?.count)
  const filterControl = (filter: NonNullable<DataTableToolbarProps['filters']>[number]) => <div key={filter.id} className={cn('min-w-0 max-w-full shrink', filter.width === 'wide' ? 'w-56' : 'w-44')}><Label htmlFor={`${filterId}-${filter.id}`} className="sr-only">{filter.label}</Label>
    <SelectField id={`${filterId}-${filter.id}`} controlSize="sm" disabled={selected} value={filter.value} onChange={(event) => filter.onValueChange(event.target.value)}>{filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectField>
  </div>
  const earlierFilters = filters.slice(0, -1)
  const lastFilter = filters.at(-1)
  const activeFilters = filters.filter((filter) => filter.active)
  const filterSummary = activeFilters.map((filter) => `${filter.displayLabel ?? filter.label}: ${filter.options.find((option) => option.value === filter.value)?.label ?? filter.value}`).join(' · ')
  return <div role="region" aria-label={label} className="flex min-h-(--control-height-sm) flex-wrap items-center gap-3">
    {search ? <div className="grid w-full sm:w-64">
      <div className={cn('relative col-start-1 row-start-1', selected && 'invisible')} inert={selected || undefined}>
        <Label htmlFor={searchId} className="sr-only">{search.label}</Label>
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input ref={searchRef} id={searchId} type="search" controlSize="sm" className="pl-9" placeholder={search.placeholder} value={search.value} onChange={(event) => search.onValueChange(event.target.value)} enterKeyHint="search" />
      </div>
      {selection ? <div className={cn('col-start-1 row-start-1 flex items-center', !selected && 'invisible')}><Text size="small" weight="medium" aria-live="polite">{selection.count} selected</Text></div> : null}
    </div> : selected ? <Text size="small" weight="medium" aria-live="polite">{selection?.count} selected</Text> : null}
    {filterPresentation === 'popover' && filters.length ? <div className="flex min-w-0 max-w-full items-center gap-2">
      <Popover>
        <PopoverTrigger aria-description={activeFilters.length ? `Active filters: ${activeFilters.length}` : 'No active filters'} render={<Button variant="outline" size="sm" disabled={selected} />}>
          <ListFilter aria-hidden="true" />Filters{activeFilters.length ? ` (${activeFilters.length})` : ''}
        </PopoverTrigger>
        <PopoverContent ref={filterPopupRef} side="bottom" className="w-72" initialFocus={(type) => type === 'keyboard' ? true : filterPopupRef.current}>
          <div className="space-y-4 p-3">
            <PopoverTitle>Filters</PopoverTitle>
            {filters.map((filter) => <div key={filter.id} className="space-y-1.5">
              <Label htmlFor={`${filterId}-${filter.id}`}>{filter.displayLabel ?? filter.label}</Label>
              <SelectField id={`${filterId}-${filter.id}`} aria-label={filter.label} controlSize="sm" disabled={selected} value={filter.value} onChange={(event) => filter.onValueChange(event.target.value)}>{filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectField>
            </div>)}
            {onReset ? <PopoverClose render={<Button variant="ghost" size="sm" disabled={selected || !resetActive} onClick={onReset} />}>Clear filters</PopoverClose> : null}
          </div>
        </PopoverContent>
      </Popover>
      <Text size="small" tone="muted" className="sr-only min-w-0 max-w-full break-words sm:not-sr-only sm:w-44" aria-live="polite">{filterSummary}</Text>
    </div> : filters.length || onReset ? <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
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
