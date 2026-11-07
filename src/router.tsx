import { createBrowserRouter } from 'react-router'
import App from './App'
import { AppLayout } from '@/components/layout/app-layout'
import { SiteLayout } from '@/components/layout/site-layout'
import { LandingPage } from '@/features/landing/pages/landing-page'
import { OverviewPage } from '@/features/overview/pages/overview-page'
import { NotFoundPage } from '@/pages/not-found-page'
import { RouteErrorPage } from '@/pages/route-error-page'

export const router = createBrowserRouter([
  {
    id: 'root',
    Component: App,
    ErrorBoundary: RouteErrorPage,
    children: [
      {
        Component: SiteLayout,
        children: [
          { index: true, Component: LandingPage },
          { path: '*', Component: NotFoundPage },
        ],
      },
      {
        path: 'app',
        Component: AppLayout,
        children: [
          { index: true, Component: OverviewPage },
          { path: '*', element: <NotFoundPage homePath="/app" /> },
        ],
      },
    ],
  },
])
