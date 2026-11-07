import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function RouteErrorPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <title>Something went wrong · Mews</title>
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">We could not display this page. Reload it to try again.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={() => window.location.reload()} className="min-h-11 px-4">Reload page</Button>
        <a href="/" className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 px-4')}>Back to home</a>
      </div>
    </main>
  )
}
