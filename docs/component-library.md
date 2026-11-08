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

The controls use Base UI primitives and editable shadcn source. Fredoka supplies headings; Geist supplies body and control text. Both fonts are bundled locally. Lucide supplies interface icons; the shared Mews cat-print asset supplies every indeterminate loader.

## Run and inspect

Brand assets live under **Foundations → Brand assets**. `src/assets/mews-cat.svg` is the shared, downloadable cat mark. `CatMark` and `MewsWordmark` in `src/components/brand-assets.tsx` reuse that asset; the app's `Brand` link uses the wordmark. Stories show the mark, wordmark, small sizes, and a Fredoka display heading. The gallery includes these stories alongside the UI components.

Component samples use fictional cat care records: Canal colony, Miso and Pepper, feeding visits, fresh water, care notes, and visit photos. Technical variant names remain visible for development. The card logs a visit in local state and prevents duplicate logging. The dialog shows a past feeding visit. The staged-save demo represents saving visit details, uploading photos, and updating colony history; it does not send data.

Run `npm run storybook` and visit http://127.0.0.1:6006/. The workspace groups components under Foundations, Actions, Forms, Feedback, Display, and Overlays, with full screens under Pages. Shared components also cover Typography, Loading Indicator, Loading Stages, Skeleton, Alert, Empty State, and Text Link.

Storybook opens **Gallery → Component gallery** by default. It opens with the color palette and live loading-stage and indicator controls. The workspace uses component names and technical labels for the development team and agents. A light/dark switch and category filters let you inspect the theme. The collection shows all components and their variants on one page. Direct links to other stories and Docs pages still open those pages. The examples are interactive. Select a variant name to open its story and controls.

Use Storybook's sidebar and search to select a component or state. The Docs page shows the available examples and controls. Examples use temporary local state and do not call a backend or persist data. The main app is separate, with the landing page at http://127.0.0.1:5197/ and a workspace shell at http://127.0.0.1:5197/app.

The public landing page uses the production Heading, Text, Button, Badge, brand assets, and ColonyMap components. Its main action scrolls to the community tracker on the same page, with working area selection. Fixture and integration notes stay in Storybook Docs; no live care feed is connected. The map and Storybook share fictional public areas from `src/data/demo-public-map.ts`. Shared artwork lives in `src/components/illustrations/community-cat.tsx` and appears under **Foundations → Brand assets → Community illustration**. **Pages → Public pages** shows the real landing and About pages with their shared header and footer. The `/about` route contains the mission and public-location explanation. Public page layout lives in `src/styles/landing.css`; account routes retain the compact shell.

`npm run build-storybook` produces `storybook-static/`, independently from the app's `dist/` build. Only the documentation addon is configured. Playwright runs browser checks separately; no hosting service is installed. The directory is ignored by Git.

## Extend deliberately

To add a shadcn component, use `npx shadcn@latest add <component>` from the project root. It uses the repository's existing `components.json` and writes component source under `src/components/ui/`.

Add a `<component>.stories.tsx` beside the source, using Storybook's `Meta` and `StoryObj` types. Give it a category title and focused states. Shared preview configuration imports the actual app styles and enables generated documentation. Keep product-specific behavior in feature folders. Use semantic tokens such as `primary`, `background`, and `border` when styling shared components.

The gallery automatically includes new `src/components/ui/**/*.stories.tsx` files and their exported stories. It uses Storybook's `composeStories` API to reuse story arguments, render functions, and decorators. There is no separate component list or sample markup to update. Gallery previews do not run story loaders or interaction tests; use individual stories for those. If the library becomes large, reduce the gallery to one representative story per component to keep the initial render fast.

Our component source is editable, and custom SVG icons and components can be added when required. Review upstream changes explicitly when updating generated components.

## Theme and component APIs

Backoffice and account pages use shared Mews components and theme tokens. Keep navigation inside the workspace or account routes, including recovery links. `AccountLayout` has the Mews brand linked to `/app`, with no public-site navigation or promotional footer. Do not add marketing illustrations, planned-feature cards, or placeholder panels to the backoffice. Show a data empty state only after a real data request confirms that the list is empty.

`CatPawPrint` in `src/components/brand-assets.tsx` uses `src/assets/mews-cat-print.svg` as its single source. Use it for all cat-print icons, including buttons and the paw loader. **Foundations → Brand assets → Cat prints** shows 16, 24, and 48 px sizes and includes the SVG download. Do not substitute Lucide's generic `PawPrint`.

Change shared values in `src/styles/tokens.css`. Components use semantic tokens, rather than palette values. White is the default `background`, `card`, and `popover` surface. `brand-background` supplies the cream public canvas. `sidebar` uses a warm near-white, with pink for the active item. Warm gray supplies `muted`, `border`, and `input`. The gallery shows these surface tokens alongside the brand colors.

Use the same typography, radius, and color tokens in the public site, workspace, and portal content. Do not add page-specific theme overrides or substitute a different heading font. Fredoka headings and action labels, Geist body text, orange actions, and pink accents are shared Mews styles.

Page CSS controls layout and spacing only. Buttons and links use the actual shared components, including their anchor rendering API. Typography uses `Heading`, `HeadingAccent`, and `Text`; the lead paragraph size and accent colors are documented in Typography stories. The cat illustration and `CareSticker` are shared brand assets. The tracker uses `ColonyMap` without descendant CSS overrides, decorative audience chips, or redundant activity filters. Fixture and integration details belong in these docs and Storybook Docs, not in product screens. `AGENTS.md` records this policy.

**Pages → Sign in** renders the production `SignInScreen` inside the production account layout. Stories cover normal, signing-in, error, and contact-administrator states. Story interactions only change local error feedback; real sign-in requests stay in the route page. **Pages → Dashboard** renders the production overview with a fictional signed-in user. Its typography and the landing page’s heading, action, and map surface were checked against the rendered app, including phone widths.

Orange action backgrounds use dark text. `primary-text` supplies a darker orange for small links; `primary-display` supplies an orange with sufficient contrast for large headings. Success uses olive. Errors use `destructive`, and warnings use `warning`.

- `Heading`: choose semantic `level` separately from visual `size` (`display`, `title`, `section`, `card`, `compact`, or `label`). Compact and label headings cover map record names and section labels without local font-size rules.
- `Text`: choose `size` (`metric`, `lead`, `body`, `small`, `caption`, or `label`), `tone` (`default`, `muted`, or `danger`), and optional `weight` (`normal`, `medium`, or `semibold`). Use `metric` for prominent counts and `render={<span />}` for inline content; the same size, weight, and color rules apply to paragraph and inline text.
- `Card`: owns surface color, border, corners, and focus ring. Use `tone="note"` for a warm note surface, and `padding="none"` for maps, tables, or lists that fill the surface. `CardHeader`, `CardContent`, `CardFooter`, and `CardList` own the standard content spacing, footer surface, and list separators. Use `render` to preserve semantic containers such as a map's `section`.
- `ViewSwitcher`: a labelled, controlled set of buttons for switching between presentations of the same content. The selected view is exposed with `aria-pressed`.
- `EmptyState`: owns icon or illustration treatment, heading, description, and optional `action`. Use `illustration` in place of `icon` for a larger decorative image, `tone="danger"` for failures, and `size="page"` with `headingLevel={1}` for full recovery pages. Maps, no-results views, and recovery pages reuse this component.
- `TextLink`: use `variant="navigation"` for sidebar routes and `variant="skip"` for the keyboard skip link. Active, hover, and focus states live in the shared component.
- `AccountButton`, `RecordButton`, `Popover`, and `Disclosure`: shared account triggers, record selection, overlay surfaces, and expandable history. Each has a focused Storybook example. Product code supplies content and behavior; it does not reproduce their appearance.
- `Button` media and selection variants support photo controls and selectable records. Anchor rendering automatically uses link semantics. `MewsWordmark` uses its `size` API (`sm`, `default`, or `lg`) rather than page-level text classes.
- `Button loading`: disables the action, sets `aria-busy`, and centers the shared compact cat-print loader at full contrast. The original content stays in the layout and accessible name but is visually hidden, so loading does not change the button size. Keep useful button text such as “Saving update”.
- `ButtonLabel`: wrap a changing label and pass all possible text values in `labels`. The widest value reserves space from the first render. Only the current label is visible and exposed to assistive technology. Use this for loading/completion labels and toggles instead of a fixed page-level width. **Actions → Button → State changes** covers text sizes, leading and trailing icons, icon-only buttons, full-width actions, record buttons, and account buttons.
- `Badge`: adds `success` and `warning` variants to the existing API.
- `LoadingIndicator`: cat prints are the only supported graphic. Small controls use one print; medium and large loaders use three. Buttons, staged progress, map loading, and route loading use the same component and cat-print asset. Choose a shared `size` and an accessible `label`, use `paused` to freeze the animation, and use `decorative` when the parent already names the loading state. Reduced motion keeps the prints static. Do not add page-level size, color, timing, or motion overrides. Product pages may control only the surrounding layout and spacing; playback overrides are for Storybook inspection.

Cat-print loading uses opacity only, with no positional movement. The shared `--duration-loading` token sets the repeating status cycle to 1.2 seconds; three prints are spaced evenly across that cycle. Small prints use a stronger resting opacity for legibility. Loading buttons retain full contrast while remaining disabled and marked `aria-busy`; ordinary disabled buttons remain dimmed.

**Feedback → Loading indicator → Motion preview** shows standalone, compact, primary-button, and outline-button loaders together, with pause and one-third-speed controls. The preview uses the shared `--loader-play-state` and `--loader-playback-duration` properties; slow playback scales the phase spacing with the duration. These properties are optional playback controls, not separate page styles.
- `LoadingStages`: pass stable step IDs and labels, the zero-based `currentStep`, and `status` (`loading`, `complete`, or `error`). Error messages are announced. Invalid step indices are clamped; an empty list has a specific empty message. Set `paused` to stop its indicator. The component does not make requests or advance itself.
- `Skeleton`: a decorative placeholder. Put one loading label on its containing region and set `aria-busy` there.

`src/styles/feedback.css` contains the CSS loading loops. Cat-print loaders use opacity only and become static when reduced motion is requested. Button feedback uses the shared fast duration and easing token. The staged playback timer lives only in `src/stories/examples/loading-stages-demo.tsx` and is cleared when the example unmounts or pauses. The demo supports run, pause, next step, error, retry, and reset. Retry keeps the failed step. `loading-indicator-demo.tsx` provides size, pause, and one-third-speed controls. Typography stories label each size and line height, and separate semantic heading level from visual size.

## Verification

The app build, TypeScript check, and Storybook build pass. Local sandboxed Chromium checks cover save feedback, stage playback through completion, category filters, light/dark switching, the error story, loading button disabling, and reduced motion. The gallery fits at 390 px without horizontal scrolling. Previews use sample state and do not call a backend.

## Current dependency audit

The font installation reports two low and nine moderate advisories in the dependency tree. Dependency remediation is separate from this component change; no automatic breaking upgrades were applied.

## Agent inspection

Agents can open the live gallery or a specific story URL, inspect its DOM and accessibility labels, use controls, and capture screenshots. For example:

- `/iframe.html?id=feedback-loading-indicator--cat-prints&viewMode=story`
- `/iframe.html?id=feedback-loading-stages--interactive&viewMode=story`
- `/iframe.html?id=foundations-typography--headings&viewMode=story`

The Storybook manager provides controls and generated Docs. Playwright runs the shared component state checks below. Accessibility testing addons are not installed. Skills such as Animate and Stageshow supply design guidance; the browser tools observe and operate the rendered components.

## Shared interaction states

All shared controls follow the same state rules. The production components own these styles; pages must not replace them.

| State | Rule |
| --- | --- |
| Hover | Temporary feedback. It must not select an item or copy another item's selected appearance. It clears when the pointer leaves. |
| Selected/current | A persistent fill, underline, or check mark. It stays visible during hover, press, and keyboard focus. Use the component's native semantics: `aria-current`, `aria-pressed`, `aria-selected`, or `aria-checked`. |
| Keyboard focus | A separate visible ring or native outline, including on selected and invalid controls. Shared control rings use the full theme ring color. |
| Expanded | A popup trigger has an expanded marker in addition to hover feedback. Popover triggers retain a border while open; disclosures retain their open chevron. |
| Disabled/loading | No activation. Skip the control in keyboard navigation and keep hover from suggesting it is available. This also applies when Button renders a link. Loading keeps the shared cat-print indicator and `aria-busy`. |
| Invalid | Preserve the error state while adding a separate visible focus indicator. |
| Passive content | No invented hover, selection, or tab stop. Badges show link feedback only when rendered as a link or button. Cards and text rendered as links must remain keyboard accessible. |

**Foundations → Interaction states** contains browser fixtures for Buttons, Fields, Selection, Links, and Offline map. The fixtures render production components and keep sample state inside Storybook. The offline map uses an empty local style so state tests do not depend on external tiles. Account, notification, dialog, drawer, and workspace checks also use their individual component stories.

Run `npm run validate:ui` to check the component types, variant coverage, and browser states together. Use `npm run test:ui` for browser checks alone. The suite checks both themes, keyboard activation, selected + hover, selected + focus, invalid + focus, disabled/loading controls, popup dismissal and focus return, phone-width layouts, and simulated touch. Modal checks include focus trapping. Tests compare actual rendered fills, borders, underlines, and focus indicators as well as accessible state attributes.

Style checks wait for the expected rendered state, and layout checks wait for fonts. This keeps short CSS transitions from causing false failures. Overlay checks preserve initial keyboard focus: Tab may leave and dismiss a nonmodal popover, while a modal dialog keeps focus inside.

`src/stories/fixtures/interaction-contracts.ts` records coverage for every shared UI source file, including passive components and controls composed from other shared components. A browser test compares this list with the source directory. When adding a component, add its browser checks and coverage entry, or document why it has no interactive states. The TypeScript check also requires the Button and Badge fixture lists to match their production variant APIs. A new or removed variant must update the fixtures, so the state checks exercise it.

The normal test command starts or reuses Storybook on port 6006. For a built Storybook served elsewhere, set `UI_TEST_BASE_URL` to that server's origin. This avoids live reloads during validation. Each test run writes to its own directory under the ignored `test-results/` folder, with failure screenshots and traces. Tests use the approved secure Chrome launcher with sandboxing enabled. Simulated touch does not replace a physical-device check; these checks do not constitute a full accessibility audit.

## Navigation state checks

`WorkspaceNavigation` is shared by the app sidebar and **Actions → Workspace navigation**. Its stories use an in-memory router, so links change the current item without account requests. The gallery also includes these stories.

| State | Expected appearance and behavior |
| --- | --- |
| Current route | Pink fill, medium text weight, `aria-current="page"`. |
| Hover another link | Gray fill. The current link stays pink; the route does not change. |
| Hover the current link | The current appearance stays the same. |
| Keyboard focus | A visible inset ring appears on either link. Focus does not change the route. |
| Click or Enter | The destination becomes current. Exactly one of these two workspace links is current. Clicking the current link keeps it current. |
| Pointer leaves | Hover fill clears. The current-page fill stays. |

Run `npm run test:ui`. Playwright starts Storybook when needed, or uses the running server on port 6006. Checks cover both themes, 390 px and 1440 px widths, hover on current and other items, click, keyboard focus and Enter, and simulated touch. These assertions compare rendered colors as well as route semantics, so a hover fill that matches the current-page fill fails the check. Touch simulation does not replace a physical-device check.

The browser config uses `/Users/admin/.local/bin/eday-secure-chrome` with `chromiumSandbox: true`. On another machine, configure a matching approved launcher before running the checks. Failure screenshots and traces are saved in the ignored `test-results/` directory. Inspect a specific story at `/iframe.html?id=actions-workspace-navigation--overview-current&viewMode=story`.

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
| Display | 44 px, 72 px from the small breakpoint | 1.02 |
| Page title | 30 px, 36 px from the small breakpoint | 1.25 |
| Section | 24 px | 1.2 |
| Card title | 18 px | 1.35 |
| Lead | 18 px | 32 px |
| Body | 16 px | 28 px |
| Small body | 14 px | 24 px |
| Label | 12 px | 20 px |

The `--type-*` values in `src/styles/tokens.css` own the size scale. `Heading` keeps heading level separate from visual size. `Text` labels use sentence case and semibold weight. Use the explicit length form of Tailwind CSS variables in shared heading styles so the class merger distinguishes font size from text color.

Default buttons, inputs, and preview selects use `--control-height` (44 px). Small controls use 36 px; extra-small controls use 28 px; large controls use 48 px. Fields keep 16 px text for coarse pointers. Control corners use `--control-radius` (14 px); cards, dialogs, the map surface, and gallery frames use `--surface-radius` (20 px). Cards use the shared border color and 24 px default content spacing, or 16 px in their small size. Map zoom controls use the control size tokens.

## Inbox controls and screen

**Display → Data table** documents the shared TanStack Table v9 factory and component. `useDataTable` and `createDataColumnHelper` bind shared sorting, pagination, row selection, and column visibility APIs. Features supply columns, data, stable row IDs, and their own mutations. `DataTable` renders shared controls, a sticky table header, 10/25/50 row page sizes, selection actions, and empty/loading/error states. Multi-page viewports keep a stable height. Delayed pages keeps old rows visible and inert during the next request. The delays and retry fixture run only in Storybook. TanStack Query is deferred until a report API exists. See [the implementation boundary](decisions/0005-shared-tanstack-table.md).

The shared Button `table-header` variant supplies sorting controls with body typography and standard button hover and focus behavior. Unread `TableOpenButton` titles have stronger weight and a dot; read titles keep the same marker space so text does not shift.

**Actions → View tabs** documents controlled Base UI tabs with optional counts and arrow-key activation. Pass selected content as children so the tab and panel stay associated. **Forms → Select field** provides a native select with shared control tokens and disabled/invalid states. **Display → Table** provides semantic, compact record rows with native title buttons for keyboard access. **Overlays → Drawer** provides a right-side panel whose body scrolls while its header and footer stay visible. It fills phone screens. **Actions → Notification button** uses the standard Lucide bell at 20 px with a small attention dot and an accessible count.

**Pages → Reports** renders the real table, drawer, and workspace toolbar. Review, Report drawer, Busy inbox, Waiting for details, Processed, and Empty stories use fictional local data. Search, filtering, matching, questions, tasks, duplicate links, finish/reopen, and photo viewing work locally. The toolbar bell opens urgent reports. **New report** accepts photos, audio, PDF, text, Word, and CSV attachments, with previews, removal, and downloads. Nothing is uploaded, sent, or written to D1. Refresh resets the workspace provider. The example cat photo is a stock image. See [inbox scope and verification](inbox.md).

**Navigation → Workspace header** documents the shared sticky top bar. It places linked parent breadcrumbs and the single page heading on the left, with actions and notifications on the right. Route `handle.breadcrumb` values supply the workspace path. Current top-level pages show their name without a redundant parent. Long labels truncate while actions keep their width. Workspace bodies do not repeat page titles or introductory descriptions. The Dashboard story uses the same complete workspace layout as Inbox.

**New report** and report review both use the shared Drawer. The creation drawer renders a native form through `DrawerContent`'s render API, with fields in `DrawerBody` and Cancel/Submit controls in `DrawerFooter`. Its header and footer remain visible as attachments increase the form height. The shared Button permits explicit caller positioning, so dialog/drawer close controls remain top-right. Dialogs have a viewport height limit and scroll when required.

## Table toolbar and visual hierarchy

`DataTable` accepts a `toolbar` configuration for the shared `DataTableToolbar`. Search, Status, and Colony sit together directly above the table border. The toolbar has no enclosing box or bottom divider; a small gap separates it from the table. The Inbox uses one report list and no status tabs. Status starts at Pending; All reports removes the restriction. Clear filters clears all three criteria. Selecting rows replaces those controls with the count and bulk read action; Clear selection returns to the search and filter values. The isolated toolbar stories demonstrate controlled fields. `Input` and `SelectField` expose `controlSize="sm"` through the shared control-height token.

`Table` exposes comfortable and compact density. `DataTable` uses compact density. Unread titles use weight and an accessible description rather than a dot. Inbox review values use plain shared Text; urgent reports use red text beside their category. Idle sortable headers have no arrow; the active sort retains its direction and aria-sort. View tab counts are plain numbers. A single page with ten or fewer records shows its count without paging controls. Larger results retain page-size and navigation controls. These changes preserve the Mews theme and the report drawer flow.

## Report status and notifications

Reports use the status field with pending, waiting, and processed values. `reportStatusLabels` supplies the same labels in the table, toolbar filter, and drawer. The canonical page is `/app/reports`; its single top-bar title and navigation label are Reports. New report belongs to the table toolbar, while notifications stay in the workspace top bar.

`Feedback → Notifications` documents the shared Sonner host and toast API in `src/components/ui/toaster.tsx`. Completed report actions use brief notifications without moving the page content. Field errors remain next to fields. The report drawer uses the shared compact header density and card-sized DialogTitle, with category, urgency, status, reporter, and time grouped below the title.

## Placeholder hints and progress

`Input` and `Textarea` use `--placeholder-foreground` for empty hints. The light and dark themes keep hints less prominent than entered values. Hints do not replace visible labels. **Forms → Input → Entered value** and **Forms → Textarea → Entered value** show the difference. The shared field browser checks verify distinct colors and readable contrast.

`ProgressRing` shows a determinate count against a known total. Primary and success tones use the shared palette; zero totals display a dash. Size and stroke width come from the shared progress tokens. **Feedback → Progress ring** covers partial, complete, not started, and no items. It adds no animation or loading state.

Long forms use `DialogContent layout="scroll"`, a form with a flex column layout, `DialogHeader`, `DialogBody`, and `DialogFooter`. The outer shell clips its rounded corners. Only the body scrolls, with the shared inset scroll track; title, close control, and footer actions remain fixed. **Overlays → Dialog → Scrolling form** documents this structure. Task creation and editing use it. `tests/ui/dialog-scroll.spec.ts` checks body scrolling, fixed header/footer positions, focus return, and narrow viewports in both themes.
