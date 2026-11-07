import { ArrowUpRight } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Brand } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { TextLink } from '@/components/ui/text-link'
import { Text } from '@/components/ui/typography'
import '@/styles/landing.css'

export function SiteLayout() {
  const pathname = useLocation().pathname
  const publicPage = pathname === '/' || pathname === '/about'
  return (
    <div className="flex min-h-svh flex-col bg-brand-background">
      <header className={publicPage ? 'landing-site-header' : 'border-b'}>
        <div className={publicPage ? 'landing-width landing-site-nav' : 'mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-6 sm:px-10'}>
          <Brand to="/" />
          {publicPage ? <nav aria-label="Main navigation" className="landing-nav-links"><TextLink render={pathname === '/' ? <a href="#tracker" /> : <Link to="/#tracker" />}>Colony tracker</TextLink><TextLink render={<NavLink to="/about" />}>About</TextLink></nav> : null}
          <Button variant="outline" render={<Link to="/app" />}>{publicPage ? 'Volunteer sign in' : 'Open app'} <ArrowUpRight aria-hidden="true" /></Button>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none"><Outlet /></main>
      <footer className={publicPage ? undefined : 'border-t'}>
        <div className="landing-width landing-site-footer">
          <Brand to="/" />
          {publicPage ? <nav aria-label="Footer navigation"><TextLink size="sm" render={<Link to="/about" />}>About Mews</TextLink><TextLink size="sm" render={<Link to="/app" />}>Volunteer sign in</TextLink></nav> : <Text size="small" tone="muted">Community cat care</Text>}
        </div>
      </footer>
    </div>
  )
}
