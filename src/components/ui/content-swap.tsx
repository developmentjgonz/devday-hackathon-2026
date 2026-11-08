import type { ReactNode } from 'react'
import './content-swap.css'

/** Crossfade between task states while keeping their common layout footprint. */
export function ContentSwap({ active, panels }: { active: string; panels: Record<string, ReactNode> }) {
  return <div className="mews-content-swap">{Object.entries(panels).map(([name, content]) => <div key={name} className="mews-content-swap-panel" data-active={name === active} aria-hidden={name !== active || undefined} inert={name !== active || undefined}>{content}</div>)}</div>
}
