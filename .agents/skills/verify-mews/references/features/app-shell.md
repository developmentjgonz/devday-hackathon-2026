# Application shell

## Entry points and prerequisites

Run `npm run dev` and open `http://127.0.0.1:5197/`. For production asset checks, run `npm run build`, then `npm run preview` on port 4197.

Use an active local test account to open `/app`; see `docs/local-accounts.md`. The overview stays within the backoffice workspace. Colony, cat, and report workflows are not implemented.

## Implemented behavior

- `/` shows the public layout with a landing placeholder and workspace links.
- `/app` shows the workspace layout with an active Overview link and a personal greeting. There are no public-site actions, marketing illustrations, or placeholder data cards.
- Sign-in, access requests, and account status use `AccountLayout`. Its brand link points to `/app`; it has no public navigation or promotional footer.
- Workspace not-found and error recovery return to `/app`. Public errors retain their public home link.
- Workspace navigation uses real links. Browser back, forward, and direct reload keep the requested page.
- `WorkspaceNavigation` owns sidebar interaction styles. The current route stays pink while another hovered link uses gray. Keyboard focus adds a visible ring. Hover does not select a route.
- The first keyboard link skips to the main content. A path change moves focus to that region. Pages have distinct document titles.
- The sidebar becomes a compact header and navigation on narrow screens; there is no menu drawer.
- Unknown URLs outside `/app` use the public layout and return to `/`.
- Unknown URLs under `/app/` keep the app layout and return to `/app`.
- The root error boundary offers a full reload or a return home if a route fails unexpectedly.

## Manual checks

1. Open `/`. Confirm the landing title and follow the workspace link.
2. Sign in with an active test account. Confirm the address is `/app`, the page title is Overview, and the Overview link is active. Confirm the greeting uses the account's first name and there is no Community tracker action.
3. Use back, forward, and reload. Confirm each requested page renders.
4. Open `/missing` and `/app/missing` directly. Confirm the matching layout and recovery link.
5. Reload `/`, press Tab, then Enter. Confirm the skip link moves focus to the main region.
6. Navigate between layouts with the keyboard. Confirm focus moves to the new main region.
7. Check `/` and `/app` at 320px, 390px, 768px, and 1440px widths. Confirm no horizontal overflow.
8. Check the browser console for uncaught errors.

## Automated navigation check

Run `npm run test:ui`. It opens the production navigation in Storybook and checks current + hover, hover on another item, click, keyboard focus and Enter, pointer leave, and simulated touch in light and dark themes. Width checks use 390 px and 1440 px. The tests assert both `aria-current` and rendered colors, so two links with the same current-page fill fail validation. Real browser history and account access still need the manual checks above.

The production preview returns the SPA document for unknown frontend paths; the client renders the not-found page. Cloudflare already uses single-page application fallback for frontend URLs. API routing remains separate in the Worker.
