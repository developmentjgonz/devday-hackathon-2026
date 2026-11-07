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

Brand assets live under **Foundations → Brand assets**. `src/assets/mews-cat.svg` is the shared, downloadable cat mark. `CatMark` and `MewsWordmark` in `src/components/brand-assets.tsx` reuse that asset; the app's `Brand` link uses the wordmark. Stories show the mark, wordmark, small sizes, and a Fredoka display heading. The gallery includes these stories alongside the UI components.

Component samples use fictional cat care records: Canal colony, Miso and Pepper, feeding visits, fresh water, care notes, and visit photos. Technical variant names remain visible for development. The card logs a visit in local state and prevents duplicate logging. The dialog shows a past feeding visit. The staged-save demo represents saving visit details, uploading photos, and updating colony history; it does not send data.

Run `npm run storybook` and visit http://127.0.0.1:6006/. The workspace includes 14 UI component groups plus Brand assets under Foundations, Actions, Forms, Feedback, Display, and Overlays. The original nine controls now use the custom theme. New groups cover Typography, Loading Indicator, Loading Stages, and Skeleton.

Storybook opens **Gallery → Component gallery** by default. It opens with the color palette and live loading-stage and indicator controls. The workspace uses component names and technical labels for the development team and agents. A light/dark switch and category filters let you inspect the theme. The collection shows all components and their variants on one page. Direct links to other stories and Docs pages still open those pages. The examples are interactive. Select a variant name to open its story and controls.

Use Storybook's sidebar and search to select a component or state. The Docs page shows the available examples and controls. Examples use temporary local state and do not call a backend or persist data. The main app is separate, with the landing page at http://127.0.0.1:5197/ and a workspace shell at http://127.0.0.1:5197/app.

The public landing page uses the production Heading, Text, Button, Badge, brand assets, and ColonyMap components. Its main action leads to the community tracker, with working area filters and map selection. The tracker has one sample-data label; no live care feed is connected. The map and Storybook share fictional public areas from `src/data/demo-public-map.ts`. Shared artwork lives in `src/components/illustrations/community-cat.tsx` and appears under **Foundations → Brand assets → Community illustration**. **Pages → Public pages** shows the real landing and About pages with their shared header and footer. The `/about` route contains the mission and public-location explanation. Public page layout lives in `src/styles/landing.css`; account routes retain the compact shell.

`npm run build-storybook` produces `storybook-static/`, independently from the app's `dist/` build. Only the documentation addon is configured; no testing or hosting service is installed. The directory is ignored by Git.

## Extend deliberately

To add a shadcn component, use `npx shadcn@latest add <component>` from the project root. It uses the repository's existing `components.json` and writes component source under `src/components/ui/`.

Add a `<component>.stories.tsx` beside the source, using Storybook's `Meta` and `StoryObj` types. Give it a category title and focused states. Shared preview configuration imports the actual app styles and enables generated documentation. Keep product-specific behavior in feature folders. Use semantic tokens such as `primary`, `background`, and `border` when styling shared components.

The gallery automatically includes new `src/components/ui/**/*.stories.tsx` files and their exported stories. It uses Storybook's `composeStories` API to reuse story arguments, render functions, and decorators. There is no separate component list or sample markup to update. Gallery previews do not run story loaders or interaction tests; use individual stories for those. If the library becomes large, reduce the gallery to one representative story per component to keep the initial render fast.

Our component source is editable, and custom SVG icons and components can be added when required. Review upstream changes explicitly when updating generated components.

## Theme and component APIs

Change shared values in `src/styles/tokens.css`. Components use semantic tokens, rather than palette values. White is the default `background`, `card`, and `popover` surface. `brand-background` supplies the cream public canvas. `sidebar` uses a warm near-white, with pink for the active item. Warm gray supplies `muted`, `border`, and `input`. The gallery shows these surface tokens alongside the brand colors.

Use the same typography, radius, and color tokens in the public site, workspace, and portal content. Do not add page-specific theme overrides or substitute a different heading font. Fredoka headings and action labels, Geist body text, orange actions, and pink accents are shared Mews styles.

Orange action backgrounds use dark text. `primary-text` supplies a darker orange for small links; `primary-display` supplies an orange with sufficient contrast for large headings. Success uses olive. Errors use `destructive`, and warnings use `warning`. A flame loader is a loading symbol, not an error or urgency indicator.

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

## Colony map

`Display → Colony map` includes public area summaries, fictional team markers, loading, empty, retry, and sample update stories. The map uses MapLibre GL JS with an OpenFreeMap basemap and visible attribution. Basemap tiles need network access; no API key is needed for this provider. The renderer loads on demand when its preview approaches the viewport.

`ColonyMap` takes a discriminated `data` prop. Public data contains broad area polygons, activity levels, and count bands. Team data contains colony coordinates and care status. The rendering sources copy only named fields. The public heatmap uses the centers of the supplied areas; it never derives its positions from the team fixture. All demo locations and records are fictional.

The component can display data throughout the United States or elsewhere. Miami is only the demo fixture. By default, the starting view fits the supplied data. Pass `initialView={{ center: [longitude, latitude], zoom }}` to use an account's saved region later. Account configuration and nationwide filtering/clustering are not implemented. Panning and pinch zoom are supported; touch gestures still need a physical-phone check.

Public zoom limits are a display choice, not a privacy guarantee. Production must authorize team access on the server and publish a separate, approved public dataset. Agree on aggregation areas, minimum colony counts, suppression of sparse areas, and update delays before exposing real data. No single distance guarantees safety. Real-time feeds and production access checks are not part of these stories.

Run `npm run test:map` to check public source field filtering, separation of public/team sources, and care-status updates. The app and Storybook builds also type-check the component. Direct preview: `/iframe.html?id=display-colony-map--public-areas&viewMode=story`.

Map previews use the production component without visible test commentary. Fictional-data and integration notes live in Storybook Docs. Selection is shown by the card and marker highlight, with a short screen-reader announcement. `snapshotLabel` is optional and intended for a real update label supplied by the caller. The team legend names the three care statuses.

## Typography and surface rules

The reference informs the warm palette, bold rounded headings, orange actions, and soft corners. The gallery remains a component workspace: palette, technical labels, category filters, and direct story links.

Use `Heading` for semantic headings. Card and Dialog titles share its `headingVariants`; map titles and page headers use the same scale. Native headings also receive the heading font as a fallback. Fredoka is used for headings, action labels, and colony card names. Geist is used for body text, fields, labels, badges, counts, and care details. Technical property labels remain monospace.

| Role | Size | Line height |
| --- | --- | --- |
| Display | 48 px, 72 px from the small breakpoint | 1.02 |
| Page title | 30 px, 36 px from the small breakpoint | 1.25 |
| Section | 24 px | 1.2 |
| Card title | 18 px | 1.35 |
| Body | 16 px | 28 px |
| Small body | 14 px | 24 px |
| Label | 12 px | 20 px |

The `--type-*` values in `src/styles/tokens.css` own the size scale. `Heading` keeps heading level separate from visual size. `Text` labels use sentence case and semibold weight. Use the explicit length form of Tailwind CSS variables in shared heading styles so the class merger distinguishes font size from text color.

Default buttons, inputs, and preview selects use `--control-height` (44 px). Small controls use 36 px; extra-small controls use 28 px; large controls use 48 px. Fields keep 16 px text for coarse pointers. Control corners use `--control-radius` (14 px); cards, dialogs, the map surface, and gallery frames use `--surface-radius` (20 px). Cards use the shared border color and 24 px default content spacing, or 16 px in their small size. Map zoom controls use the control size tokens.
