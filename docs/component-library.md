# Component library

The component library is the collection of reusable interface components. Together with shared theme tokens and design rules, it forms the project's design system. The public and workspace shells use the shared theme.

## Locations

- `src/components/ui/`: shadcn component source, currently using Base UI primitives.
- `src/components/layout/`: separate public and workspace layouts, app navigation, and the shared skip link.
- `src/components/brand.tsx` and `src/components/page-header.tsx`: shared product presentation components.
- `src/features/<area>/pages/`: page content; feature-only components stay in the same feature folder as needed.
- `src/pages/`: shared not-found and route-error pages.
- `src/components/ui/*.stories.tsx`: colocated component states and interactive examples.
- `src/stories/component-gallery.stories.tsx`: a single-page gallery that discovers and reuses all component stories.
- `.storybook/main.ts` and `.storybook/preview.ts`: component discovery, documentation addon, and shared style import.
- `src/styles/tokens.css`: stock shadcn neutral token values for light and dark appearances. The gallery currently displays the light appearance.
- `src/styles/globals.css`: Tailwind imports, token-to-utility mappings, and global styles.
- `components.json`: shadcn paths and preset configuration.

The CLI's default Nova preset provides initial component styling, Geist provides the bundled font, and Lucide provides icons. These are replaceable starting choices. None establishes a final product brand.

## Run and inspect

Run `npm run storybook` and visit http://127.0.0.1:6006/. The workspace includes Button, Input, Label, Textarea, Checkbox, Badge, Card, Dialog, and Separator stories, grouped under Actions, Forms, Display, and Overlays.

Storybook opens **Gallery → Component gallery** by default. It shows all components and their variants on one page. Direct links to other stories and Docs pages still open those pages. The examples are interactive. Select a variant name to open its story and controls.

Use Storybook's sidebar and search to select a component or state. The Docs page shows the available examples and controls. Examples use temporary local state and do not call a backend or persist data. The main app is separate, with a landing placeholder at http://127.0.0.1:5197/ and a workspace shell at http://127.0.0.1:5197/app.

`npm run build-storybook` produces `storybook-static/`, independently from the app's `dist/` build. Only the documentation addon is configured; no testing or hosting service is installed. The directory is ignored by Git.

## Extend deliberately

To add a shadcn component, use `npx shadcn@latest add <component>` from the project root. It uses the repository's existing `components.json` and writes component source under `src/components/ui/`.

Add a `<component>.stories.tsx` beside the source, using Storybook's `Meta` and `StoryObj` types. Give it a category title and focused states. Shared preview configuration imports the actual app styles and enables generated documentation. Keep product-specific behavior in feature folders. Use semantic tokens such as `primary`, `background`, and `border` when styling shared components.

The gallery automatically includes new `src/components/ui/**/*.stories.tsx` files and their exported stories. It uses Storybook's `composeStories` API to reuse story arguments, render functions, and decorators. There is no separate component list or sample markup to update. Gallery previews do not run story loaders or interaction tests; use individual stories for those. If the library becomes large, reduce the gallery to one representative story per component to keep the initial render fast.

Our component source is editable, and custom SVG icons and components can be added when required. Review upstream changes explicitly when updating generated components.

## Current dependency audit

The setup audit reports two low and seven moderate advisories in development tooling dependencies. The production-only audit reports zero advisories. The offered automatic fixes require breaking package changes, so they have not been applied as part of this setup.
