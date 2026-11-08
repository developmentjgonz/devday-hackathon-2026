import type { CSSProperties } from 'react'
import { Toaster as Sonner } from 'sonner'
import { LoadingIndicator } from './loading-indicator'

export { toast } from 'sonner'

/** One shared notification host. Sonner owns timing, stacking, and dismissal. */
export function Toaster() {
  return <Sonner
    position="bottom-right"
    closeButton
    duration={4500}
    visibleToasts={3}
    containerAriaLabel="Notifications"
    icons={{ loading: <LoadingIndicator decorative size="sm" /> }}
    style={{
      '--normal-bg': 'var(--popover)',
      '--normal-text': 'var(--popover-foreground)',
      '--normal-border': 'var(--border)',
      '--border-radius': 'var(--control-radius)',
      fontFamily: 'var(--font-sans)',
    } as CSSProperties}
    toastOptions={{
      closeButtonAriaLabel: 'Dismiss notification',
      style: { fontFamily: 'var(--font-sans)', fontSize: 'var(--type-small)', lineHeight: 1.5 },
      classNames: { description: '!text-muted-foreground' },
    }}
  />
}
