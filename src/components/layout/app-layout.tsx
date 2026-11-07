import { ChevronRight } from 'lucide-react'
import { Outlet, useLoaderData } from 'react-router'
import { AppSidebar } from './app-sidebar'
import type { SessionUser } from '../../../shared/types/auth'

export function AppLayout() {
  const user = useLoaderData() as SessionUser
  return (
    <div className="min-h-svh bg-background text-foreground md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <AppSidebar user={user} />
      <div className="min-w-0">
        <header className="flex min-h-16 items-center border-b px-6 sm:px-10 lg:px-12">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <li>Mews</li>
              <li aria-hidden="true"><ChevronRight className="size-3.5 text-muted-foreground/60" /></li>
              <li className="font-medium text-foreground" aria-current="page">Workspace</li>
            </ol>
          </nav>
        </header>
        <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1240px] px-6 py-9 outline-none sm:px-10 sm:py-12 lg:px-12 lg:py-14">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
