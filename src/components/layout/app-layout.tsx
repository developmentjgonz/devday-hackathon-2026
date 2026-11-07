import { ChevronRight } from 'lucide-react'
import { Outlet } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { AppSidebar } from './app-sidebar'

export function AppLayout() {
  return (
    <div className="min-h-svh md:grid md:grid-cols-[232px_minmax(0,1fr)]">
      <AppSidebar />
      <div className="min-w-0">
        <header className="flex min-h-16 items-center justify-between gap-4 border-b px-6 sm:px-10">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            Mews <ChevronRight className="size-3.5" aria-hidden="true" />
            <span className="text-foreground">Workspace</span>
          </p>
          <Badge variant="outline">Preview</Badge>
        </header>
        <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-6 py-8 outline-none sm:px-10 sm:py-12">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
