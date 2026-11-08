import type { ComponentProps } from 'react'
import { ChevronsUpDown } from 'lucide-react'
import { Button } from './button'
import { Text } from './typography'

export function AccountButton({ name, description, ...props }: Omit<ComponentProps<typeof Button>, 'children' | 'variant' | 'size'> & { name: string; description: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join('').toLocaleUpperCase()
  return (
    <Button variant="account" size="account" {...props}>
      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full border border-foreground/5 bg-secondary text-secondary-foreground">
        <Text render={<span />} size="label">{initials}</Text>
      </span>
      <span className="min-w-0 flex-1">
        <Text render={<span />} size="small" weight="medium" className="block truncate">{name}</Text>
        <Text render={<span />} size="caption" tone="muted" className="mt-0.5 block truncate">{description}</Text>
      </span>
      <ChevronsUpDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
    </Button>
  )
}
