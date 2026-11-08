import { createBrowserRouter } from 'react-router'
import App from './App'
import { AppLayout } from '@/components/layout/app-layout'
import { SiteLayout } from '@/components/layout/site-layout'
import { AccountLayout } from '@/components/layout/account-layout'
import { LandingPage } from '@/features/landing/pages/landing-page'
import { AboutPage } from '@/features/about/pages/about-page'
import { PrivacyPage, TermsPage } from '@/features/legal/pages/legal-page'
import { CommunityPage } from '@/features/community/pages/community-page'
import { OverviewPage } from '@/features/overview/pages/overview-page'
import { InboxPage } from '@/features/inbox/pages/inbox-page'
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
          { path: 'community', Component: CommunityPage },
          { path: 'privacy', Component: PrivacyPage },
          { path: 'terms', Component: TermsPage },
          { path: '*', Component: NotFoundPage },
        ],
      },
      {
        Component: AccountLayout,
        children: [
          { path: 'sign-in', loader: signInLoader, Component: SignInPage },
          { path: 'sign-up', loader: signUpLoader, Component: SignUpPage },
          { path: 'account-status', loader: accountStatusLoader, Component: AccountStatusPage },
        ],
      },
      {
        path: 'app',
        id: 'workspace',
        loader: workspaceLoader,
        Component: AppLayout,
        children: [
          { index: true, Component: OverviewPage, handle: { breadcrumb: 'Overview' } },
          { path: 'inbox', Component: InboxPage, handle: { breadcrumb: 'Inbox' } },
          { path: '*', element: <NotFoundPage homePath="/app" /> },
        ],
      },
    ],
  },
])
