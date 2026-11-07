import { Cat, ClipboardList, MapPin, PanelsTopLeft } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'

const plannedAreas = [
  { icon: MapPin, title: 'Colonies', description: 'Colony records and visits.' },
  { icon: Cat, title: 'Cats', description: 'Individual cats and care history.' },
  { icon: ClipboardList, title: 'Reports', description: 'Volunteer updates and review.' },
]

export function OverviewPage() {
  return (
    <>
      <title>Overview · Mews</title>
      <PageHeader title="Overview" description="A shared home for your rescue’s day-to-day care." />
      <section aria-labelledby="workspace-placeholder" className="rounded-xl border">
        <div className="flex flex-col items-center px-6 py-16 text-center sm:py-20">
          <span className="mb-5 flex size-12 items-center justify-center rounded-xl border bg-muted/40">
            <PanelsTopLeft className="size-5 text-muted-foreground" aria-hidden="true" />
          </span>
          <h2 id="workspace-placeholder" className="text-lg font-medium tracking-tight">Your workspace starts here</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            The shell is ready. Colony updates, cat records, and volunteer reports will have a home here as we build each workflow.
          </p>
          <Badge variant="outline" className="mt-5">Placeholder · No live rescue data</Badge>
        </div>
        <div className="border-t bg-muted/20 px-6 py-4 text-center text-xs leading-5 text-muted-foreground">
          This preview shows the workspace structure. Records and reporting are not connected yet.
        </div>
      </section>
      <section aria-labelledby="planned-workflows" className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="planned-workflows" className="text-sm font-medium">Future workspace areas</h2>
          <span className="text-xs text-muted-foreground">Planned</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {plannedAreas.map(({ icon: Icon, title, description }) => (
            <article key={title} className="rounded-xl border p-5">
              <Icon className="mb-4 size-5 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-sm font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
