import { PawPrint } from 'lucide-react'
import { Link } from 'react-router'

export function Brand({ to }: { to: string }) {
  return (
    <Link
      to={to}
      aria-label="Mews home"
      className="inline-flex w-fit items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
        <PawPrint className="size-4" aria-hidden="true" />
      </span>
      <span className="text-xl font-semibold tracking-tight">Mews</span>
    </Link>
  )
}
