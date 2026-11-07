import { useState, type ReactNode } from 'react'
import { ArrowUpRight, Check, Plus, Search, Shapes } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

const categories = ['All components', 'Actions', 'Forms', 'Display', 'Overlays'] as const
type Category = (typeof categories)[number]

function ButtonExample() {
  const [message, setMessage] = useState('Try a button to see its response.')
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setMessage('Primary button clicked.')}><Plus aria-hidden="true" />Primary</Button>
        <Button variant="secondary" onClick={() => setMessage('Secondary button clicked.')}>Secondary</Button>
        <Button variant="outline" onClick={() => setMessage('Outline button clicked.')}>Outline</Button>
        <Button variant="ghost" onClick={() => setMessage('Ghost button clicked.')}>Ghost<ArrowUpRight aria-hidden="true" /></Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="destructive" onClick={() => setMessage('Destructive appearance previewed. Nothing was deleted.')}>Destructive</Button>
        <Button variant="link" onClick={() => setMessage('Link button clicked.')}>Link</Button>
        <Button disabled>Disabled</Button>
      </div>
      <p role="status" className="text-xs text-muted-foreground">{message}</p>
    </div>
  )
}

function InputExample() {
  const [name, setName] = useState('')
  return (
    <div className="w-full max-w-sm space-y-5">
      <div className="space-y-2">
        <Label htmlFor="example-name">Name</Label>
        <Input id="example-name" placeholder="Enter a name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" />
        <p className="text-xs text-muted-foreground">{name ? `Preview: ${name}` : 'A label, an input, and helpful supporting text.'}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="example-disabled">Disabled input</Label>
        <Input id="example-disabled" placeholder="Unavailable" disabled />
      </div>
    </div>
  )
}

function TextareaExample() {
  return (
    <div className="w-full max-w-sm space-y-2">
      <Label htmlFor="example-notes">Notes</Label>
      <Textarea id="example-notes" placeholder="Write a few details…" rows={3} aria-describedby="notes-hint" />
      <p id="notes-hint" className="text-xs text-muted-foreground">Sample content stays on this page.</p>
    </div>
  )
}

function CheckboxExample() {
  const [checked, setChecked] = useState(false)
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Checkbox id="example-checkbox" checked={checked} onCheckedChange={setChecked} />
        <Label htmlFor="example-checkbox">Enable this example</Label>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox id="example-checkbox-disabled" disabled />
        <Label htmlFor="example-checkbox-disabled" className="text-muted-foreground">Disabled option</Label>
      </div>
      <p role="status" className="text-xs text-muted-foreground">{checked ? 'The option is selected.' : 'The option is not selected.'}</p>
    </div>
  )
}

function BadgeExample() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="destructive">Destructive</Badge>
    </div>
  )
}

function CardExample() {
  const [saved, setSaved] = useState(false)
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle><h3>A reusable content card</h3></CardTitle>
        <CardDescription>Group a title, supporting content, and an action.</CardDescription>
      </CardHeader>
      <CardContent><p className="text-sm text-muted-foreground">This example uses the same shared components available to future screens.</p></CardContent>
      <CardFooter className="justify-between gap-4">
        <span role="status" className="text-xs text-muted-foreground">{saved ? 'Saved for this preview' : 'Example content'}</span>
        <Button variant="outline" onClick={() => setSaved((previous) => !previous)}>{saved ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}{saved ? 'Saved' : 'Save example'}</Button>
      </CardFooter>
    </Card>
  )
}

function DialogExample() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Open dialog<ArrowUpRight aria-hidden="true" /></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog preview</DialogTitle>
          <DialogDescription>A focused layer for a short task or message. Try Escape, the close button, or the button below.</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Focus stays in the dialog while it is open and returns to the trigger when it closes.</p>
        <DialogFooter><DialogClose render={<Button />}>Done</DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const examples: { id: string; name: string; category: Category; description: string; source: string; render: () => ReactNode }[] = [
  { id: 'button', name: 'Button', category: 'Actions', description: 'Actions with a clear hierarchy.', source: 'button.tsx', render: () => <ButtonExample /> },
  { id: 'input', name: 'Input', category: 'Forms', description: 'A single line of text, with a visible label.', source: 'input.tsx + label.tsx', render: () => <InputExample /> },
  { id: 'textarea', name: 'Textarea', category: 'Forms', description: 'Space for a longer response.', source: 'textarea.tsx', render: () => <TextareaExample /> },
  { id: 'checkbox', name: 'Checkbox', category: 'Forms', description: 'An independent selection or preference.', source: 'checkbox.tsx', render: () => <CheckboxExample /> },
  { id: 'badge', name: 'Badge', category: 'Display', description: 'A compact label for supporting information.', source: 'badge.tsx', render: () => <BadgeExample /> },
  { id: 'card', name: 'Card', category: 'Display', description: 'Related content and actions, grouped together.', source: 'card.tsx', render: () => <CardExample /> },
  { id: 'dialog', name: 'Dialog', category: 'Overlays', description: 'A focused task above the current page.', source: 'dialog.tsx', render: () => <DialogExample /> },
  { id: 'separator', name: 'Separator', category: 'Display', description: 'A quiet division between related sections.', source: 'separator.tsx', render: () => <div className="w-full max-w-sm space-y-4 text-sm"><p>First section</p><Separator /><p className="text-muted-foreground">Second section</p></div> },
]

export function ComponentGallery() {
  const [category, setCategory] = useState<Category>('All components')
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const visibleExamples = examples.filter((example) =>
    (category === 'All components' || example.category === category) &&
    `${example.name} ${example.category} ${example.description}`.toLowerCase().includes(normalizedQuery),
  )

  return (
    <div className="min-h-svh bg-background text-foreground">
      <a href="#gallery-content" className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50">Skip to components</a>
      <header className="border-b">
        <div className="mx-auto flex min-h-18 max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <a href="/" className="flex items-center gap-3 rounded-sm font-medium outline-offset-4">
            <span className="flex size-9 items-center justify-center rounded-lg border bg-muted/40"><Shapes className="size-4" aria-hidden="true" /></span>
            <span>Component library<span className="ml-3 hidden text-sm font-normal text-muted-foreground sm:inline">Mews</span></span>
          </a>
          <span className="text-xs text-muted-foreground">Neutral defaults · Theme to be decided</span>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl lg:grid-cols-[208px_minmax(0,1fr)]">
        <aside className="border-b px-5 py-6 sm:px-8 lg:min-h-[calc(100svh-73px)] lg:border-r lg:border-b-0 lg:py-10">
          <nav aria-label="Component categories" className="lg:sticky lg:top-8">
            <p className="mb-4 text-xs font-medium text-muted-foreground">LIBRARY</p>
            <div className="flex flex-wrap gap-1 lg:flex-col">
              {categories.map((item) => (
                <Button key={item} variant={category === item ? 'secondary' : 'ghost'} className="justify-between gap-5 lg:w-full" aria-pressed={category === item} onClick={() => setCategory(item)}>
                  {item}<span className="text-xs text-muted-foreground">{item === 'All components' ? examples.length : examples.filter((example) => example.category === item).length}</span>
                </Button>
              ))}
            </div>
            <p className="mt-8 hidden text-xs leading-relaxed text-muted-foreground lg:block">Shared components.<br />One place to try them.</p>
          </nav>
        </aside>

        <main id="gallery-content" className="min-w-0 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-xl">
              <p className="mb-3 text-xs font-medium text-muted-foreground">FOUNDATION / COMPONENTS</p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">The building blocks.</h1>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">Explore the shared components, try their states, and see how they fit together. Our visual identity can grow from here.</p>
            </div>
            <Badge variant="outline" className="mt-1">shadcn/ui</Badge>
          </div>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b pb-6">
            <div className="relative w-full sm:max-w-xs">
              <Label htmlFor="component-search" className="sr-only">Search components</Label>
              <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="component-search" type="search" placeholder="Search components…" className="h-10 pl-9" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <p role="status" className="text-xs text-muted-foreground">{visibleExamples.length} {visibleExamples.length === 1 ? 'component' : 'components'}</p>
          </div>

          {visibleExamples.length > 0 ? (
            <div className="grid items-start gap-5 xl:grid-cols-2">
              {visibleExamples.map((example) => (
                <section key={example.id} id={example.id} aria-labelledby={`${example.id}-heading`} className="overflow-hidden rounded-xl border">
                  <div className="flex items-start justify-between gap-4 border-b bg-muted/20 px-5 py-4">
                    <div><h2 id={`${example.id}-heading`} className="text-sm font-semibold">{example.name}</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{example.description}</p></div>
                    <span className="pt-0.5 text-[11px] text-muted-foreground">{example.category}</span>
                  </div>
                  <div className="flex min-h-40 items-center px-5 py-7">{example.render()}</div>
                  <div className="border-t bg-muted/15 px-5 py-3"><code className="break-words text-[11px] text-muted-foreground">components/ui/{example.source}</code></div>
                </section>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed px-6 py-14 text-center">
              <h2 className="font-medium">No matching components</h2>
              <p className="mt-2 text-sm text-muted-foreground">Try another search or reset the filters.</p>
              <Button variant="outline" className="mt-5" onClick={() => { setQuery(''); setCategory('All components') }}>Reset filters</Button>
            </div>
          )}

          <footer className="mt-10 border-t pt-5 text-xs leading-relaxed text-muted-foreground">Preview only. Example interactions do not save data.</footer>
        </main>
      </div>
    </div>
  )
}
