import { ArrowUpRight } from 'lucide-react'
import { Link, Outlet } from 'react-router'
import { Brand } from '@/components/brand'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function SiteLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-6 sm:px-10">
          <Brand to="/" />
          <nav aria-label="Main navigation">
            <Link to="/app" className={cn(buttonVariants({ variant: 'outline' }), 'min-h-10 px-3')}>
              Open app <ArrowUpRight aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground sm:px-10">
          <p>Mews · Community cat care</p>
          <p>Early preview</p>
        </div>
      </footer>
    </div>
  )
}
