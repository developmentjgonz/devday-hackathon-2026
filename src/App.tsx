import { useEffect, useRef } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { SkipLink } from '@/components/layout/skip-link'
import { NavigationPending } from '@/components/layout/navigation-pending'
import { Toaster } from '@/components/ui/toaster'

/** Shared route behavior. Public and workspace layouts own their own UI. */
export default function App() {
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)

  useEffect(() => {
    if (previousPath.current !== pathname) {
      document.getElementById('main-content')?.focus({ preventScroll: true })
      previousPath.current = pathname
    }
  }, [pathname])

  return (
    <>
      <SkipLink />
      <Outlet />
      <NavigationPending />
      <ScrollRestoration />
      <Toaster />
    </>
  )
}
