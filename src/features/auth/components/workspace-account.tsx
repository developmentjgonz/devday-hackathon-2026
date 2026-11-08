import { Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription } from '@/components/ui/popover'
import { AccountButton } from '@/components/ui/account-button'
import { Separator } from '@/components/ui/separator'
import type { SessionUser } from '../../../../shared/types/auth'
import { SignOutButton } from './sign-out-button'
import { Text } from '@/components/ui/typography'

export function WorkspaceAccount({ user }: { user: SessionUser }) {
  const role = user.role === 'administrator' ? 'Administrator' : 'Member'

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Account options for ${user.name}`}
        render={<AccountButton name={user.name} description={role} />}
      />
      <PopoverContent>
        <div className="px-3 py-3">
          <PopoverTitle className="truncate">{user.name}</PopoverTitle>
          <PopoverDescription className="mt-1 break-all">{user.email}</PopoverDescription>
          <Text size="caption" tone="muted" className="mt-2">{role}</Text>
        </div>
        <Separator />
        <SignOutButton variant="ghost" className="mt-1 w-full justify-start" />
      </PopoverContent>
    </Popover>
  )
}
