import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Brand } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { TextLink } from '@/components/ui/text-link'
import { Text } from '@/components/ui/typography'
import '@/styles/landing.css'

export function SiteLayout() {
  const pathname = useLocation().pathname
  if (pathname === '/report/chat') {
    return <div className="h-dvh bg-background"><main id="main-content" tabIndex={-1} className="h-full outline-none"><Outlet /></main></div>
  }
  const publicPage = ['/', '/community', '/report', '/report/chat', '/privacy', '/terms'].includes(pathname)
  return (
    <div className="flex min-h-svh flex-col bg-brand-background">
      <header className={publicPage ? 'landing-site-header' : 'border-b'}>
        <div className={publicPage ? 'landing-width landing-site-nav' : 'mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-6 sm:px-10'}>
          <Brand to="/" />
          {publicPage ? <nav aria-label="Main navigation" className="landing-nav-links"><TextLink render={pathname === '/' ? <a href="#tracker" /> : <Link to="/#tracker" />}>Tracker</TextLink><TextLink render={<NavLink to="/community" />}>Community board</TextLink><TextLink render={pathname === '/' ? <a href="#about" /> : <Link to="/#about" />}>About</TextLink></nav> : null}
          <Button variant="outline" render={<Link to="/app" />}>{publicPage ? 'Sign in' : 'Open app'}</Button>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none"><Outlet /></main>
      <footer className={publicPage ? undefined : 'border-t'}>
        <div className="landing-width landing-site-footer">
          <Brand to="/" />
          {publicPage ? <nav aria-label="Footer navigation"><TextLink size="sm" render={pathname === '/' ? <a href="#about" /> : <Link to="/#about" />}>About Mews</TextLink><TextLink size="sm" render={<Link to="/report" />}>Tell us about a cat</TextLink><TextLink size="sm" render={<Link to="/app" />}>Sign in</TextLink><TextLink size="sm" render={<NavLink to="/privacy" />}>Privacy Policy</TextLink><TextLink size="sm" render={<NavLink to="/terms" />}>Terms</TextLink></nav> : <Text size="small" tone="muted">Community cat care</Text>}
        </div>
      </footer>
    </div>
  )
}
