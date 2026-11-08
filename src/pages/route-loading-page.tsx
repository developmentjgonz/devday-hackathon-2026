import { LoadingIndicator } from '@/components/ui/loading-indicator'
import { Text } from '@/components/ui/typography'

export function RouteLoadingPage() {
  return (
    <main className="flex min-h-svh items-center justify-center gap-3 px-6">
      <LoadingIndicator decorative />
      <Text size="small" tone="muted" role="status">Opening Mews…</Text>
    </main>
  )
}
