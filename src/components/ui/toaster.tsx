import { useEffect, useState, type CSSProperties } from 'react'
import { Toaster as Sonner } from 'sonner'
import { LoadingIndicator } from './loading-indicator'

export { toast } from 'sonner'

function useDrawerActionOffset() {
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    let footer: Element | null = null
    let frame = 0
    function update() {
      const footers = document.querySelectorAll('[data-slot="drawer-content"][data-open] [data-slot="drawer-footer"]')
      const next = footers.item(footers.length - 1)
      if (next !== footer) {
        sizes.disconnect()
        footer = next
        if (footer) sizes.observe(footer)
      }
      setOffset(footer ? Math.max(0, innerHeight - footer.getBoundingClientRect().top) : 0)
    }
    function schedule() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    const sizes = new ResizeObserver(schedule)
    const changes = new MutationObserver(schedule)
    changes.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-open'] })
    window.addEventListener('resize', schedule)
    update()
    return () => {
      cancelAnimationFrame(frame)
      sizes.disconnect()
      changes.disconnect()
      window.removeEventListener('resize', schedule)
    }
  }, [])
  return offset
}

/** One shared notification host. Sonner owns timing, stacking, and dismissal. */
export function Toaster() {
  const actionOffset = useDrawerActionOffset()
  return <Sonner
    position="bottom-right"
    closeButton
    duration={4500}
    visibleToasts={3}
    offset={{ bottom: actionOffset + 32 }}
    mobileOffset={{ bottom: actionOffset + 16 }}
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
