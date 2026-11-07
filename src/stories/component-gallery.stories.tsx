import { composeStories, type Meta, type StoryObj } from '@storybook/react-vite'
import preview from '../../.storybook/preview'

type ComponentStories = { default: Meta } & Record<string, StoryObj>

// Keep discovery aligned with the component story glob in .storybook/main.ts.
const modules = import.meta.glob<ComponentStories>('../components/ui/**/*.stories.tsx', { eager: true })
const components = Object.entries(modules)
  .map(([path, stories]) => {
    const title = stories.default.title ?? path.split('/').at(-1)!.replace('.stories.tsx', '')
    const parts = title.split('/')
    return {
      title,
      name: parts.at(-1),
      category: parts.slice(0, -1).join(' / '),
      stories: Object.values(composeStories(stories, preview)),
    }
  })
  .sort((a, b) => a.title.localeCompare(b.title))

function ComponentGallery() {
  return (
    <main className="mx-auto max-w-7xl space-y-8 p-5 sm:p-8">
      <header className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Component library · {components.length} components</p>
        <h1 className="text-3xl font-semibold tracking-tight">Component gallery</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Browse and try every component in one place. Select a variant name to open its story and controls.
        </p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {components.map((component) => (
          <section key={component.title} aria-label={component.name} className="min-w-0 rounded-xl border bg-card text-card-foreground">
            <header className="space-y-1 border-b px-5 py-4">
              <p className="text-xs text-muted-foreground">{component.category}</p>
              <h2 className="text-lg font-semibold">{component.name}</h2>
            </header>
            <div className="divide-y">
              {component.stories.map((Example) => (
                <div key={Example.id} className="space-y-4 p-5">
                  <a
                    href={`./?path=/story/${Example.id}`}
                    target="_top"
                    className="inline-block rounded-sm text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                    aria-label={`Open ${component.name}: ${Example.storyName}`}
                  >
                    {Example.storyName}
                  </a>
                  <div className="min-w-0"><Example /></div>
                </div>
              ))}
            </div>
          </section>
        ))}
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
