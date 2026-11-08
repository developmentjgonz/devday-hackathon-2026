import { Link } from 'react-router'
import { CatMark, MewsWordmark } from './brand-assets'

export function Brand({ to, variant = 'wordmark' }: { to: string; variant?: 'wordmark' | 'mark' }) {
  return (
    <Link
      to={to}
      aria-label="Mews home"
      className="inline-flex min-h-11 min-w-11 w-fit items-center justify-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
    >
      {variant === 'mark' ? <CatMark alt="" /> : <MewsWordmark size="sm" />}
    </Link>
  )
}
