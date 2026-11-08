import type { ComponentProps } from 'react'
import { ChevronsUpDown } from 'lucide-react'
import { Button } from './button'
import { Text } from './typography'
import { UserAvatar } from './user-avatar'

export function AccountButton({ name, description, avatarUrl, ...props }: Omit<ComponentProps<typeof Button>, 'children' | 'variant' | 'size'> & { name: string; description: string; avatarUrl?: string }) {
  return (
    <Button variant="account" size="account" {...props}>
      <UserAvatar name={name} src={avatarUrl} size="sm" />
      <span className="min-w-0 flex-1">
        <Text render={<span />} size="small" weight="medium" className="block truncate">{name}</Text>
        <Text render={<span />} size="caption" tone="muted" className="mt-0.5 block truncate">{description}</Text>
      </span>
      <ChevronsUpDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
    </Button>
  )
}
