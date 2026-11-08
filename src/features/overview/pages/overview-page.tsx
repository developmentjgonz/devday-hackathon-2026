import { useRouteLoaderData } from 'react-router'
import { PageHeader } from '@/components/page-header'
import type { SessionUser } from '../../../../shared/types/auth'

export function OverviewPage() {
  const user = useRouteLoaderData('workspace') as SessionUser
  const firstName = user.name.trim().split(/\s+/)[0] || user.name
  return (
    <>
      <title>Overview · Mews</title>
      <PageHeader title="Overview" description={`Welcome back, ${firstName}.`} />
    </>
  )
}
