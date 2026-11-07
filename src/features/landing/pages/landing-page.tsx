import { ArrowRight, Cat, ClipboardList, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const areas = [
  { icon: MapPin, title: 'Colonies', description: 'A place for colony locations, feeding visits, and care needs.' },
  { icon: Cat, title: 'Cats', description: 'A place for individual cat records and their care history.' },
  { icon: ClipboardList, title: 'Reports', description: 'A place to bring volunteer updates together for review.' },
]

export function LandingPage() {
  return (
    <>
      <title>Mews · Community cat care</title>
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-24">
        <section aria-labelledby="landing-title" className="max-w-3xl">
          <Badge variant="secondary" className="mb-6">A workspace for community cat care</Badge>
          <h1 id="landing-title" className="text-4xl leading-[1.1] font-semibold tracking-tight sm:text-6xl">
            Colony care,<br />in one place.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
            Mews is taking shape as a shared workspace for rescue coordinators and the volunteers who care for community cats.
          </p>
          <Link to="/app" className={cn(buttonVariants({ size: 'lg' }), 'mt-8 min-h-11 gap-2 px-4')}>
            Explore the workspace <ArrowRight aria-hidden="true" />
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">Early preview. Rescue workflows are still to come.</p>
        </section>
        <section aria-labelledby="planned-areas" className="mt-16 border-t pt-8 sm:mt-24">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <h2 id="planned-areas" className="text-sm font-medium">What we’re building toward</h2>
            <Badge variant="outline">Planned</Badge>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {areas.map(({ icon: Icon, title, description }) => (
              <article key={title}>
                <Icon className="mb-4 size-5 text-muted-foreground" aria-hidden="true" />
                <h3 className="text-sm font-medium">{title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
