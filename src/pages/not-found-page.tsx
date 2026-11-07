import { ArrowLeft, FileQuestion } from 'lucide-react'
import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function NotFoundPage({ homePath = '/' }: { homePath?: string }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-20 text-center">
      <title>Page not found · Mews</title>
      <FileQuestion className="mb-6 size-8 text-muted-foreground" aria-hidden="true" />
      <p className="mb-3 text-xs font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">This page does not exist. Check the address or return home.</p>
      <Link to={homePath} className={cn(buttonVariants({ variant: 'outline' }), 'mt-6 min-h-11 px-4')}>
        <ArrowLeft aria-hidden="true" />
        {homePath === '/app' ? 'Back to overview' : 'Back to home'}
      </Link>
    </div>
  )
}
