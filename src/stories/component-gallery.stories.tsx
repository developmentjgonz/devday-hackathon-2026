import { useEffect, useState } from 'react'
import { composeStories, type Meta, type StoryObj } from '@storybook/react-vite'
import { ArrowUpRight, Moon, Sun } from 'lucide-react'
import preview from '../../.storybook/preview'
import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/typography'
import { LoadingStagesDemo } from './examples/loading-stages-demo'
import { LoadingIndicatorDemo } from './examples/loading-indicator-demo'

type ComponentStories = { default: Meta } & Record<string, StoryObj>
const modules = import.meta.glob<ComponentStories>(
  ['../components/ui/**/*.stories.tsx', './brand.stories.tsx'],
  { eager: true },
)
const categoryOrder = [
  'Foundations',
  'Actions',
  'Forms',
  'Feedback',
  'Display',
  'Overlays',
]
const components = Object.entries(modules)
  .map(([path, stories]) => {
    const title =
      stories.default.title ??
      path.split('/').at(-1)!.replace('.stories.tsx', '')
    const parts = title.split('/')
    return {
      title,
      name: parts.at(-1),
      category: parts.slice(0, -1).join(' / '),
      stories: Object.values(composeStories(stories, preview)),
    }
  })
  .sort(
    (a, b) =>
      categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) ||
      a.title.localeCompare(b.title),
  )
const categories = ['All', ...categoryOrder]
const themeTokens = [
  'background',
  'brand-background',
  'sidebar',
  'card',
  'muted',
  'foreground',
  'primary',
  'secondary',
  'accent',
  'success',
  'destructive',
  'border',
]

function ComponentGallery() {
  const [category, setCategory] = useState('All')
  const [dark, setDark] = useState(false)
  const [tokenValues, setTokenValues] = useState<Record<string, string>>({})
  // Keep portal content in the same theme as the examples.
  useEffect(() => {
    const root = document.documentElement
    const wasDark = root.classList.contains('dark')
    root.classList.toggle('dark', dark)
    const styles = getComputedStyle(root)
    setTokenValues(
      Object.fromEntries(
        themeTokens.map((token) => [
          token,
          styles.getPropertyValue(`--${token}`).trim(),
        ]),
      ),
    )
    return () => {
      root.classList.toggle('dark', wasDark)
    }
  }, [dark])
  const visible = components.filter(
    (component) => category === 'All' || component.category === category,
  )

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
          <div>
            <Heading level={1} size="title">
              Component library
            </Heading>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Mews · {components.length} components · Inspect variants, states,
              and shared theme tokens.
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Examples use fictional cat care records. Changes stay in this
              preview.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setDark((previous) => !previous)}
            aria-label={dark ? 'Use light theme' : 'Use dark theme'}
          >
            {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            {dark ? 'Dark' : 'Light'}
          </Button>
        </header>

        <section aria-labelledby="palette-title" className="border-b py-6">
          <Heading level={2} size="card" id="palette-title" className="mb-4">
            Color palette
          </Heading>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-6">
            {themeTokens.map((token) => (
              <div key={token} className="min-w-0">
                <div
                  className="mb-2 h-9 rounded-control border border-foreground/20"
                  style={{ background: `var(--${token})` }}
                />
                <code className="block break-all text-[11px]">--{token}</code>
                <code className="mt-1 block text-[10px] text-muted-foreground">
                  {tokenValues[token]}
                </code>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="motion-title" className="py-7">
          <Heading level={2} size="card" id="motion-title" className="mb-4">
            Loading and motion
          </Heading>
          <div className="grid items-stretch gap-4 md:grid-cols-2">
            <section
              aria-labelledby="stages-title"
              className="min-w-0 rounded-surface border bg-card p-5 sm:p-6"
            >
              <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
                <Heading level={3} size="card" id="stages-title">
                  LoadingStages
                </Heading>
                <a
                  href="./?path=/story/feedback-loading-stages--interactive"
                  target="_top"
                  className="text-xs text-primary-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                >
                  Open story{' '}
                  <ArrowUpRight className="inline size-3" aria-hidden="true" />
                </a>
              </div>
              <LoadingStagesDemo />
            </section>
            <section
              aria-labelledby="indicator-title"
              className="min-w-0 rounded-surface border bg-card p-5 sm:p-6"
            >
              <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
                <Heading level={3} size="card" id="indicator-title">
                  LoadingIndicator
                </Heading>
                <a
                  href="./?path=/story/feedback-loading-indicator--fire"
                  target="_top"
                  className="text-xs text-primary-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                >
                  Open fire story{' '}
                  <ArrowUpRight className="inline size-3" aria-hidden="true" />
                </a>
              </div>
              <LoadingIndicatorDemo />
            </section>
          </div>
        </section>

        <section aria-labelledby="components-title" className="pt-8 pb-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <Heading level={2} size="card" id="components-title">
              Components
            </Heading>
            <p className="text-xs text-muted-foreground">
              Select a variant name to open its story and controls.
            </p>
          </div>
          <div
            role="group"
            aria-label="Filter components"
            className="mb-6 flex flex-wrap gap-2"
          >
            {categories.map((item) => (
              <Button
                key={item}
                size="sm"
                variant={category === item ? 'default' : 'ghost'}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </Button>
            ))}
          </div>
          <p role="status" className="sr-only">
            {visible.length} components shown
          </p>
          <div className="grid items-start gap-4 xl:grid-cols-2">
            {visible.map((component) => (
              <section
                key={component.title}
                aria-label={component.name}
                className="min-w-0 rounded-surface border bg-card text-card-foreground"
              >
                <header className="flex flex-wrap items-baseline justify-between gap-2 border-b px-5 py-4">
                  <Heading level={3} size="card">
                    {component.name}
                  </Heading>
                  <span className="text-xs text-muted-foreground">
                    {component.category} · {component.stories.length}{' '}
                    {component.stories.length === 1 ? 'variant' : 'variants'}
                  </span>
                </header>
                <div className="divide-y">
                  {component.stories.map((Example) => (
                    <div key={Example.id} className="min-w-0 space-y-4 p-5">
                      <a
                        href={`./?path=/story/${Example.id}`}
                        target="_top"
                        className="inline-flex items-center gap-1 rounded-sm font-mono text-xs text-primary-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                        aria-label={`Open ${component.name}: ${Example.storyName}`}
                      >
                        {Example.storyName}
                        <ArrowUpRight className="size-3" aria-hidden="true" />
                      </a>
                      <div className="min-w-0">
                        <Example />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

const meta = {
  title: 'Gallery',
  tags: ['!autodocs'],
  parameters: { layout: 'fullscreen', controls: { disable: true } },
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>
export const AllComponents: Story = {
  name: 'Component gallery',
  render: () => <ComponentGallery />,
}
