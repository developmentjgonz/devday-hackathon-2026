# Component library

The component library is the collection of reusable interface components. Together with agreed theme tokens and design rules, it will form the project's design system. The custom visual identity has not been decided.

## Locations

- `src/components/ui/`: shadcn component source, currently using Base UI primitives.
- `src/components/ui/*.stories.tsx`: colocated component states and interactive examples.
- `.storybook/main.ts` and `.storybook/preview.ts`: component discovery, documentation addon, and shared style import.
- `src/styles/tokens.css`: stock shadcn neutral token values for light and dark appearances. The gallery currently displays the light appearance.
- `src/styles/globals.css`: Tailwind imports, token-to-utility mappings, and global styles.
- `components.json`: shadcn paths and preset configuration.

The CLI's default Nova preset provides initial component styling, Geist provides the bundled font, and Lucide provides icons. These are replaceable starting choices. None establishes a final product brand.

## Run and inspect

Run `npm run storybook` and visit http://127.0.0.1:6006/. The workspace includes Button, Input, Label, Textarea, Checkbox, Badge, Card, Dialog, and Separator stories, grouped under Actions, Forms, Display, and Overlays.

Use Storybook's sidebar and search to select a component or state. The Docs page shows the available examples and controls. Examples use temporary local state and do not call a backend or persist data. The main app at http://127.0.0.1:5197/ is separate and displays only Hello.

`npm run build-storybook` produces `storybook-static/`, independently from the app's `dist/` build. Only the documentation addon is configured; no testing or hosting service is installed. The directory is ignored by Git.

## Extend deliberately

To add a shadcn component, use `npx shadcn@latest add <component>` from the project root. It uses the repository's existing `components.json` and writes component source under `src/components/ui/`.

Add a `<component>.stories.tsx` beside the source, using Storybook's `Meta` and `StoryObj` types. Give it a category title and focused states. Shared preview configuration imports the actual app styles and enables generated documentation. Keep product-specific behavior in feature folders. Use semantic tokens such as `primary`, `background`, and `border` when styling shared components.

Our component source is editable, and custom SVG icons and components can be added when required. Review upstream changes explicitly when updating generated components.

## Current dependency audit

The setup audit reports two low and seven moderate advisories in development tooling dependencies. The production-only audit reports zero advisories. The offered automatic fixes require breaking package changes, so they have not been applied as part of this setup.
