import { useBeforeUnload, useBlocker } from 'react-router'
import { useCallback } from 'react'
import { DiscardChangesDialog } from '@/components/ui/discard-changes-dialog'

/** Mount only while an open form has changes that navigation would discard. */
export function DiscardOnNavigation({ onDiscard, preservePath, warnBeforeUnload = false }: { onDiscard?: () => void; preservePath?: string; warnBeforeUnload?: boolean }) {
  // Sign-out has already removed the session before it navigates to sign-in.
  const blocker = useBlocker(({ nextLocation }) => nextLocation.pathname !== '/sign-in' && (!preservePath || !(nextLocation.pathname === preservePath || nextLocation.pathname.startsWith(`${preservePath}/`))))
  useBeforeUnload(useCallback((event) => {
    if (warnBeforeUnload) { event.preventDefault(); event.returnValue = '' }
  }, [warnBeforeUnload]))
  return <DiscardChangesDialog
    open={blocker.state === 'blocked'}
    onOpenChange={(open) => { if (!open && blocker.state === 'blocked') blocker.reset() }}
    onDiscard={() => { if (blocker.state === 'blocked') { onDiscard?.(); blocker.proceed() } }}
  />
}
