import { useEffect, useRef, useState } from 'react'
import { Button } from './button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog'

/** Ask before an action would discard a form's changes. */
export function useDiscardConfirmation(hasChanges: boolean) {
  const [pending, setPending] = useState<(() => void) | null>(null)

  useEffect(() => {
    if (!hasChanges) return
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasChanges])

  function requestDiscard(action: () => void) {
    if (hasChanges) setPending(() => action)
    else action()
  }

  return {
    requestDiscard,
    dialogProps: {
      open: pending !== null,
      onOpenChange: (open: boolean) => { if (!open) setPending(null) },
      onDiscard: () => { setPending(null); pending?.() },
    },
  }
}

export function DiscardChangesDialog({ open, onOpenChange, onDiscard }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDiscard: () => void
}) {
  const keepEditing = useRef<HTMLButtonElement>(null)
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent initialFocus={keepEditing}>
      <DialogHeader>
        <DialogTitle size="card">Discard changes?</DialogTitle>
        <DialogDescription>Your changes will be lost if you leave without saving.</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button ref={keepEditing} type="button" variant="outline" onClick={() => onOpenChange(false)}>Keep editing</Button>
        <Button type="button" variant="destructive" onClick={onDiscard}>Discard changes</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
