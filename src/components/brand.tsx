import { Link } from 'react-router'
import { MewsWordmark } from './brand-assets'

export function Brand({ to }: { to: string }) {
  return (
    <Link
      to={to}
      aria-label="Mews home"
      className="inline-flex w-fit items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
    >
      <MewsWordmark className="text-xl" />
    </Link>
  )
}
