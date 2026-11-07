import { LoadingIndicator } from '@/components/ui/loading-indicator'

export function RouteLoadingPage() {
  return (
    <main className="flex min-h-svh items-center justify-center gap-3 px-6 text-sm text-muted-foreground">
      <LoadingIndicator label="Loading Mews" />
      <span>Opening Mews…</span>
    </main>
  )
}
