import type { ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { Text } from './typography'

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-surface border border-destructive/30 bg-card p-4">
      <CircleAlert className="mt-1 size-4 shrink-0 text-destructive" aria-hidden="true" />
      <Text size="small" tone="danger">{children}</Text>
    </div>
  )
}
