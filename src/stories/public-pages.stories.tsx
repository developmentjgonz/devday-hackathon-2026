import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { SiteLayout } from '@/components/layout/site-layout'
import { LandingPage } from '@/features/landing/pages/landing-page'
import { AboutPage } from '@/features/about/pages/about-page'
import { PrivacyPage, TermsPage } from '@/features/legal/pages/legal-page'
import { CommunityPage } from '@/features/community/pages/community-page'
import { NotFoundPage } from '@/pages/not-found-page'

// The app uses ScrollRestoration; the isolated stories use a memory router.
function StoryScroll() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

function PublicPages({ initialPath = '/' }: { initialPath?: string }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <StoryScroll />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="community" element={<CommunityPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

const meta = {
  title: 'Pages/Public pages',
  component: PublicPages,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'The real public pages, including their shared header, footer, brand illustration, and interactive tracker. Tracker areas are fictional; no live care feed or account requests are made. The volunteer workspace is outside this isolated Storybook router.' } },
  },
} satisfies Meta<typeof PublicPages>
export default meta
type Story = StoryObj<typeof meta>

export const Landing: Story = {}
export const About: Story = { args: { initialPath: '/about' } }
export const Community: Story = {
  args: { initialPath: '/community' },
  parameters: {
    docs: { description: { story: 'Three fictional volunteer openings and three fictional news posts show the community board layout. Content is stored in src/features/community/data/sample-posts.ts. There is no live feed, application flow, or publishing service.' } },
  },
}
export const Privacy: Story = { args: { initialPath: '/privacy' } }
export const Terms: Story = { args: { initialPath: '/terms' } }
