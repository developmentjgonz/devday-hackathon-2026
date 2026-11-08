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
import { MyTasksPage } from '@/features/tasks/pages/my-tasks-page'
import { ColoniesPage } from '@/features/colonies/pages/colonies-page'
import { ColonyPage } from '@/features/colonies/pages/colony-page'
import { CatsPage } from '@/features/cats/pages/cats-page'
import { CatPage } from '@/features/cats/pages/cat-page'
import { UsersPage } from '@/features/users/pages/users-page'
import type { InboxData } from '@/features/inbox/types'
import type { Params } from 'react-router'
import { NotFoundPage } from '@/pages/not-found-page'
import { RouteErrorPage } from '@/pages/route-error-page'
import { RouteLoadingPage } from '@/pages/route-loading-page'
import { accountStatusLoader, signInLoader, signUpLoader, workspaceLoader } from '@/features/auth/auth'
import { SignInPage } from '@/features/auth/pages/sign-in-page'
import { SignUpPage } from '@/features/auth/pages/sign-up-page'
import { AccountStatusPage } from '@/features/auth/pages/account-status-page'
import { ProfilePage } from '@/features/auth/pages/profile-page'

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
          { path: 'colonies', handle: { breadcrumb: 'Colonies' }, children: [
            { index: true, Component: ColoniesPage },
            { path: ':colonyId', Component: ColonyPage, handle: { breadcrumb: (params: Params, data: InboxData) => data.colonies.find((colony) => colony.id === params.colonyId)?.name ?? 'Colony not found' } },
          ] },
          { path: 'cats', handle: { breadcrumb: 'Cats' }, children: [
            { index: true, Component: CatsPage },
            { path: ':catId', Component: CatPage, handle: { breadcrumb: (params: Params, data: InboxData) => data.cats.find((cat) => cat.id === params.catId)?.name ?? 'Cat not found' } },
          ] },
          { path: 'tasks', Component: MyTasksPage, handle: { breadcrumb: 'My Tasks' } },
          { path: 'reports', Component: InboxPage, handle: { breadcrumb: 'Reports' } },
          { path: 'team', Component: UsersPage, handle: { breadcrumb: 'Team' } },
          { path: 'profile', Component: ProfilePage, handle: { breadcrumb: 'Profile' } },
          { path: '*', element: <NotFoundPage homePath="/app" /> },
        ],
      },
    ],
  },
])
