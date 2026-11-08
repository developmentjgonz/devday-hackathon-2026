import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Menu, UserRound } from 'lucide-react'
import { NavLink, useLocation } from 'react-router'
import type { SessionUser } from '../../../shared/types/auth'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, DrawerTrigger } from '@/components/ui/drawer'
import { TextLink } from '@/components/ui/text-link'
import { Text } from '@/components/ui/typography'
import { UserAvatar } from '@/components/ui/user-avatar'
import { WorkspaceNavigation } from '@/components/ui/workspace-navigation'
import { SignOutButton } from '@/features/auth/components/sign-out-button'
import { isPlainNavigation } from '@/lib/navigation'

export function MobileWorkspaceMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const navigating = useRef(false)
  const location = useLocation()
  const currentPath = `${location.pathname}${location.search}${location.hash}`
  const previousPath = useRef(currentPath)

  useEffect(() => {
    if (previousPath.current !== currentPath) {
      previousPath.current = currentPath
      if (open) {
        navigating.current = true
        setOpen(false)
      }
    }
  }, [currentPath, open])

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 48rem)')
    function closeAtDesktop(event: MediaQueryListEvent) {
      if (event.matches) {
        navigating.current = true
        setOpen(false)
      }
    }
    desktop.addEventListener('change', closeAtDesktop)
    return () => desktop.removeEventListener('change', closeAtDesktop)
  }, [])

  function closeForNavigation(to: string) {
    navigating.current = to !== currentPath
    setOpen(false)
  }

  function followProfile(event: MouseEvent<HTMLAnchorElement>) {
    if (isPlainNavigation(event)) closeForNavigation('/app/profile')
  }

  return (
    <Drawer open={open} onOpenChange={(next) => { if (next) navigating.current = false; setOpen(next) }}>
      <DrawerTrigger render={<Button ref={trigger} variant="ghost" size="icon" aria-label="Open menu" />}>
        <Menu className="size-5" aria-hidden="true" />
      </DrawerTrigger>
      <DrawerContent size="navigation" closeLabel="Close menu" motion="none" finalFocus={() => navigating.current ? document.getElementById('main-content') : trigger.current}>
        <DrawerHeader density="compact">
          <DialogTitle size="card">Menu</DialogTitle>
          <DialogDescription className="sr-only">Navigate the workspace and manage your account.</DialogDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-0 px-0 py-4">
          <WorkspaceNavigation showTeam={user.role === 'administrator'} onNavigate={closeForNavigation} />
        </DrawerBody>
        <DrawerFooter className="gap-2 px-4">
          <div className="flex min-w-0 items-center gap-3 px-3 py-2">
            <UserAvatar name={user.name} src={user.avatarUrl} size="sm" />
            <div className="min-w-0">
              <Text size="small" weight="medium" className="truncate">{user.name}</Text>
              <Text size="caption" tone="muted">{user.role === 'administrator' ? 'Administrator' : 'Member'}</Text>
            </div>
          </div>
          <div className="grid gap-1">
            <TextLink variant="navigation" onClick={followProfile} render={<NavLink to="/app/profile" />}><UserRound className="size-4" aria-hidden="true" />Profile</TextLink>
            <SignOutButton variant="navigation" />
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
