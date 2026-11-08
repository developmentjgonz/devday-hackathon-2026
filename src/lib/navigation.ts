import type { MouseEvent } from 'react'

/** Preserve modified clicks and links that open in another browsing context. */
export function isPlainNavigation(event: MouseEvent<HTMLAnchorElement>) {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && (!event.currentTarget.target || event.currentTarget.target === '_self')
}
