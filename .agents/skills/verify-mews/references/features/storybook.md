# Storybook component workspace

Entry point: http://127.0.0.1:6006/ after `npm run storybook`.

Sources: `.storybook/`, `src/components/ui/*.stories.tsx`, and `src/stories/component-gallery.stories.tsx`.

## Working behavior

- The sidebar groups 14 components into Foundations, Actions, Forms, Feedback, Display, and Overlays.
- Gallery → Component gallery appears first. It shows the color palette first, loading controls, category filters, and all component variants on one page. Labels address developers and agents. New component story files and variants appear automatically.
- Opening the Storybook root URL selects the gallery. Direct story and Docs links keep their selected page.
- Gallery examples are interactive. Each variant name links to its individual story and controls.
- Each component has a generated Docs page and focused stories for its supported states.
- Button controls can change children, size, variant, and disabled state. The boolean control has explicit False and True choices.
- The dialog example opens, accepts keyboard dismissal with Escape, and returns focus to its trigger.
- Input, textarea, and checkbox examples use labels. Disabled states and a card with temporary saved state are available.

## Verification

Both `npm run build` and `npm run build-storybook` passed. Browser checks verified the generated Button Docs page, the disabled control updating its preview, and dialog opening, Escape dismissal, and focus return.

Gallery checks matched component and variant links to the Storybook index. Card state, checkbox states, dialog dismissal and focus return, and navigation to an individual story passed. At a 390 px viewport, the gallery fits without horizontal scrolling. No browser runtime errors occurred.

The main app has separate landing and workspace shells. Storybook has no backend effects and is not included in the app's deployed build. The app and component previews use the shared Warm Company theme. Loading indicator variants include spinner, paws, and fire; loading stages cover progress, completion, error, and empty states. Reduced motion stops the decorative loops.

The theme update passed both builds. Sandboxed Chromium checks covered stage playback through completion, save feedback, category filtering, light/dark switching, error messages, disabled loading buttons, and reduced motion. At 390 px, the gallery had no horizontal overflow or runtime errors.

The developer gallery removes the promotional hero and section copy. Typography examples identify each size and line height. Agents can inspect direct story URLs and use labeled controls. Loading stage checks cover pause, stepping, errors, retry from the failed step, and completion. Fire preview controls expose variant, size, pause, and one-third-speed playback.

Colony map stories use fictional data. Public areas, team markers, loading, empty, retry, and sample care updates are available under Display. MapLibre renders the basemap and overlays. Public area inputs are separate from team coordinates. A configurable initial view supports future account settings; otherwise the data determines the extent. No Miami-specific viewport restriction is applied. Server location privacy and live feeds remain unimplemented.
