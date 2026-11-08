import { ArrowLeft, FileQuestion } from 'lucide-react'
import { Link } from 'react-router'
import { Button, ButtonLabel } from '@/components/ui/button'
import { Text } from '@/components/ui/typography'
import { EmptyState } from '@/components/ui/empty-state'

export function NotFoundPage({ homePath = '/' }: { homePath?: string }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-20 text-center">
      <title>Page not found · Mews</title>
      <Text size="label" tone="muted" className="mb-3">404</Text>
      <EmptyState size="page" headingLevel={homePath === '/app' ? 2 : 1} title={homePath === '/app' ? 'This page does not exist' : 'Page not found'} icon={<FileQuestion />} description={`Check the address or ${homePath === '/app' ? 'return to the overview.' : 'return home.'}`} action={
        <Button variant="outline" render={<Link to={homePath} />}><ArrowLeft aria-hidden="true" /><ButtonLabel labels={['Back to overview', 'Back to home']}>{homePath === '/app' ? 'Back to overview' : 'Back to home'}</ButtonLabel></Button>
      } />
    </div>
  )
}
