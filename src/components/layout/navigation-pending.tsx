import { useEffect } from 'react'
import { useNavigation } from 'react-router'
import { toast } from '@/components/ui/toaster'

const navigationToast = 'mews-opening-page'

/** Show feedback for a slow route without moving the current page. */
export function NavigationPending() {
  const navigation = useNavigation()
  useEffect(() => {
    if (navigation.state !== 'loading') return
    const timer = window.setTimeout(() => toast.loading('Opening page…', { id: navigationToast }), 250)
    return () => { window.clearTimeout(timer); toast.dismiss(navigationToast) }
  }, [navigation.state])
  return null
}
