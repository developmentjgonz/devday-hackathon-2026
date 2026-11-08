import { Button, ButtonLabel } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { CircleAlert } from 'lucide-react'
import { useLocation } from 'react-router'

export function RouteErrorPage() {
  const { pathname } = useLocation()
  const workspace = pathname === '/app' || pathname.startsWith('/app/') || ['/sign-in', '/sign-up', '/account-status'].includes(pathname)
  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <title>Something went wrong · Mews</title>
      <EmptyState size="page" headingLevel={1} tone="danger" title="Something went wrong" description="We could not display this page. Reload it to try again." icon={<CircleAlert />} action={<div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => window.location.reload()}>Reload page</Button>
        <Button variant="outline" render={<a href={workspace ? '/app' : '/'} />}><ButtonLabel labels={['Back to overview', 'Back to home']}>{workspace ? 'Back to overview' : 'Back to home'}</ButtonLabel></Button>
      </div>} />
    </main>
  )
}
