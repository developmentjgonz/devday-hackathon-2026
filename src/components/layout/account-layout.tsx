import { Outlet } from 'react-router'
import { Brand } from '@/components/brand'

/** Account access belongs to the workspace, including before sign-in. */
export function AccountLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header>
        <div className="mx-auto flex h-20 max-w-6xl items-center px-6 sm:px-10">
          <Brand to="/app" />
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
    </div>
  )
}
