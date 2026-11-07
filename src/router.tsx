import { createBrowserRouter } from 'react-router'
import App from './App'
import { AppLayout } from '@/components/layout/app-layout'
import { SiteLayout } from '@/components/layout/site-layout'
import { LandingPage } from '@/features/landing/pages/landing-page'
import { AboutPage } from '@/features/about/pages/about-page'
import { OverviewPage } from '@/features/overview/pages/overview-page'
import { NotFoundPage } from '@/pages/not-found-page'
import { RouteErrorPage } from '@/pages/route-error-page'
import { RouteLoadingPage } from '@/pages/route-loading-page'
import { accountStatusLoader, signInLoader, signUpLoader, workspaceLoader } from '@/features/auth/auth'
import { SignInPage } from '@/features/auth/pages/sign-in-page'
import { SignUpPage } from '@/features/auth/pages/sign-up-page'
import { AccountStatusPage } from '@/features/auth/pages/account-status-page'

export const router = createBrowserRouter([
  {
    id: 'root',
    Component: App,
    ErrorBoundary: RouteErrorPage,
    HydrateFallback: RouteLoadingPage,
    children: [
      {
        Component: SiteLayout,
        children: [
          { index: true, Component: LandingPage },
          { path: 'about', Component: AboutPage },
          { path: 'sign-in', loader: signInLoader, Component: SignInPage },
          { path: 'sign-up', loader: signUpLoader, Component: SignUpPage },
          { path: 'account-status', loader: accountStatusLoader, Component: AccountStatusPage },
          { path: '*', Component: NotFoundPage },
        ],
      },
      {
        path: 'app',
        id: 'workspace',
        loader: workspaceLoader,
        Component: AppLayout,
        children: [
          { index: true, Component: OverviewPage },
          { path: '*', element: <NotFoundPage homePath="/app" /> },
        ],
      },
    ],
  },
])
