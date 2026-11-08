import darkLogo from '@/assets/google-maps/dark-gray.svg'
import lightLogo from '@/assets/google-maps/white.svg'

/** Google's unmodified attribution assets, shown with Google-provided place content. */
export function GoogleMapsAttribution() {
  return <span className="inline-block px-2.5 pt-2.5 pb-1.5" translate="no">
    <img src={darkLogo} alt="Google Maps" className="h-4 w-auto dark:hidden" />
    <img src={lightLogo} alt="Google Maps" className="hidden h-4 w-auto dark:block" />
  </span>
}
