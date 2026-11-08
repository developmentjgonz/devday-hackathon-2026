import { LoadingIndicator } from '@/components/ui/loading-indicator'

export function RouteLoadingPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6">
      <LoadingIndicator size="xl" tone="brand" label="Opening Mews" />
    </main>
  )
}
