import { Popover } from '@base-ui/react/popover'
import { ChevronsUpDown } from 'lucide-react'
import type { SessionUser } from '../../../../shared/types/auth'
import { SignOutButton } from './sign-out-button'
import { headingVariants } from '@/components/ui/typography'

export function WorkspaceAccount({ user }: { user: SessionUser }) {
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join('').toLocaleUpperCase()
  const role = user.role === 'administrator' ? 'Administrator' : 'Member'

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={`Account options for ${user.name}`}
        className="flex min-h-16 w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-muted"
      >
        <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full border border-foreground/5 bg-secondary text-xs font-semibold text-secondary-foreground">
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{user.name}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{role}</span>
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="start" sideOffset={8} collisionPadding={12} className="z-50">
          <Popover.Popup className="w-64 max-w-[calc(100vw-24px)] rounded-surface border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none">
            <div className="border-b px-3 py-3">
              <Popover.Title className={headingVariants({ size: 'card', className: 'truncate' })}>{user.name}</Popover.Title>
              <Popover.Description className="mt-1 text-xs break-all text-muted-foreground">{user.email}</Popover.Description>
              <p className="mt-2 text-xs text-muted-foreground">{role}</p>
            </div>
            <SignOutButton variant="ghost" className="mt-1 w-full justify-start font-medium" />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
