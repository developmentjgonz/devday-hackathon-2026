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
- `src/styles/tokens.css`: primitive colors, semantic values for light and dark appearances, radius, and motion tokens.
- `src/styles/globals.css`: Tailwind imports, token-to-utility mappings, and global styles.
- `components.json`: shadcn paths and preset configuration.

The controls use Base UI primitives and editable shadcn source. Fredoka supplies headings; Geist supplies body and control text. Both fonts are bundled locally. Lucide supplies icons. A custom SVG supplies the flame loader.

## Run and inspect

Run `npm run storybook` and visit http://127.0.0.1:6006/. The workspace includes 13 component groups under Foundations, Actions, Forms, Feedback, Display, and Overlays. The original nine controls now use the custom theme. New groups cover Typography, Loading Indicator, Loading Stages, and Skeleton.

Storybook opens **Gallery → Component gallery** by default. It opens with the color palette and live loading-stage and indicator controls. The workspace uses component names and technical labels for the development team and agents. A light/dark switch and category filters let you inspect the theme. The collection shows all components and their variants on one page. Direct links to other stories and Docs pages still open those pages. The examples are interactive. Select a variant name to open its story and controls.

Use Storybook's sidebar and search to select a component or state. The Docs page shows the available examples and controls. Examples use temporary local state and do not call a backend or persist data. The main app is separate, with a landing placeholder at http://127.0.0.1:5197/ and a workspace shell at http://127.0.0.1:5197/app.

`npm run build-storybook` produces `storybook-static/`, independently from the app's `dist/` build. Only the documentation addon is configured; no testing or hosting service is installed. The directory is ignored by Git.

## Extend deliberately

To add a shadcn component, use `npx shadcn@latest add <component>` from the project root. It uses the repository's existing `components.json` and writes component source under `src/components/ui/`.

Add a `<component>.stories.tsx` beside the source, using Storybook's `Meta` and `StoryObj` types. Give it a category title and focused states. Shared preview configuration imports the actual app styles and enables generated documentation. Keep product-specific behavior in feature folders. Use semantic tokens such as `primary`, `background`, and `border` when styling shared components.

The gallery automatically includes new `src/components/ui/**/*.stories.tsx` files and their exported stories. It uses Storybook's `composeStories` API to reuse story arguments, render functions, and decorators. There is no separate component list or sample markup to update. Gallery previews do not run story loaders or interaction tests; use individual stories for those. If the library becomes large, reduce the gallery to one representative story per component to keep the initial render fast.

Our component source is editable, and custom SVG icons and components can be added when required. Review upstream changes explicitly when updating generated components.

## Theme and component APIs

Change shared values in `src/styles/tokens.css`. Components use semantic tokens, rather than palette values. Orange action backgrounds use dark text. `primary-text` supplies a darker orange for small links; `primary-display` supplies an orange with sufficient contrast for large headings. Success uses olive. Errors use `destructive`, and warnings use `warning`. A flame loader is a loading symbol, not an error or urgency indicator.

- `Heading`: choose the semantic `level` separately from the visual `size` (`display`, `title`, `section`, or `card`).
- `Text`: choose `size` (`body`, `small`, or `label`) and `tone` (`default` or `muted`).
- `Button loading`: disables the action, sets `aria-busy`, and adds a decorative spinner. Keep useful button text such as “Saving update”.
- `Badge`: adds `success` and `warning` variants to the existing API.
- `LoadingIndicator`: choose `variant` (`spinner`, `paws`, or `fire`), `size`, and an accessible `label`. Set `paused` to freeze the animation in place. Set `decorative` when the parent already names the loading state.
- `LoadingStages`: pass stable step IDs and labels, the zero-based `currentStep`, and `status` (`loading`, `complete`, or `error`). Error messages are announced. Invalid step indices are clamped; an empty list has a specific empty message. Set `paused` to stop its indicator. The component does not make requests or advance itself.
- `Skeleton`: a decorative placeholder. Put one loading label on its containing region and set `aria-busy` there.

`src/styles/feedback.css` contains the CSS loading loops. Motion uses transforms and opacity. Loaders become static when reduced motion is requested. Button feedback uses the shared fast duration and easing token. The staged playback timer lives only in `src/stories/examples/loading-stages-demo.tsx` and is cleared when the example unmounts or pauses. The demo supports run, pause, next step, error, retry, and reset. Retry keeps the failed step. `loading-indicator-demo.tsx` provides variant, size, pause, and one-third-speed controls. Typography stories label each size and line height, and separate semantic heading level from visual size.

## Verification

The app build, TypeScript check, and Storybook build pass. Local sandboxed Chromium checks cover save feedback, stage playback through completion, category filters, light/dark switching, the error story, loading button disabling, and reduced motion. The gallery fits at 390 px without horizontal scrolling. Previews use sample state and do not call a backend.

## Current dependency audit

The font installation reports two low and nine moderate advisories in the dependency tree. Dependency remediation is separate from this component change; no automatic breaking upgrades were applied.

## Agent inspection

Agents can open the live gallery or a specific story URL, inspect its DOM and accessibility labels, use controls, and capture screenshots. For example:

- `/iframe.html?id=feedback-loading-indicator--fire&viewMode=story`
- `/iframe.html?id=feedback-loading-stages--interactive&viewMode=story`
- `/iframe.html?id=foundations-typography--headings&viewMode=story`

The Storybook manager provides controls and generated Docs. Browser inspection is available; automated interaction tests and accessibility testing addons are not installed. Skills such as Animate and Stageshow supply design guidance; the browser tools observe and operate the rendered components.
