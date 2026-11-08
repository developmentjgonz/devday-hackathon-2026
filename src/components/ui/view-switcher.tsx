import type { ReactNode } from 'react'
import { Button } from './button'

/** A compact, labelled choice between presentations of the same content. */
export function ViewSwitcher<T extends string>({ label, value, options, onValueChange }: {
  label: string
  value: T
  options: { value: T; label: string; icon?: ReactNode }[]
  onValueChange: (value: T) => void
}) {
  return <div role="group" aria-label={label} className="flex items-center gap-1 rounded-control bg-muted p-1">
    {options.map((option) => <Button key={option.value} size="segment" variant="view-switcher"
      aria-pressed={value === option.value} onClick={() => onValueChange(option.value)}>
      {option.icon}{option.label}
    </Button>)}
  </div>
}
