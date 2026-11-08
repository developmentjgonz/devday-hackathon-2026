# Mobile polish review

Reviewed on November 8, 2026. This review checks the production screens and their existing Storybook states. It uses the shared component rules and the [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md).

## Coverage

- Live routes: Overview, My Tasks, Team Tasks, Reports, Colonies, colony details, colony bubbles, Cats, cat details, Team, all three Configuration sections, Profile, missing records, landing page and tracker, community board, public report form and chat, privacy, terms, not found, request access, and pending/suspended accounts.
- Extra Storybook states: community board post creation, editing, retirement, restoration, failed saves, member access, location permission and confirmation, optional report contact details, empty and long lists, unavailable assignees, waiting and reviewed reports, unknown colonies, care schedules, failed timelines, Team loading and errors, Configuration loading and errors, unavailable key storage, failed profile saves, sign-in errors, and recovery pages.
- Screen sizes: a route sweep at 320px; a dark-theme and accessibility sweep at 390px; focused touch checks at 390px and 820px; short overlays at 320 × 360; text enlarged to 200%; existing desktop checks through 1440px.
- Interactions: keyboard focus and return, nested drawers, cancelled navigation, saves and retries, photo selection, address search, and records without locations.

The route sweep found no page-level horizontal overflow in the initial states. It did not assume that this proved the forms or overlays were correct. Later interaction checks found the hidden photo-input overflow described below.

## Fixes

| Before | After | Shared source |
| --- | --- | --- |
| Compact text fields became 14px on touch tablets. | Inputs, selects, and textareas retain 16px text when any pointer supports touch. Compact touch controls retain a 44px height on hybrid devices. | `input.tsx`, `select-field.tsx`, `textarea.tsx`, `tokens.css` |
| The visible checkbox and switch tracks were also small tap areas. | Each control has a centered 44px hit area. Adjacent labels reserve a 44px row and activate the same control. | `checkbox.tsx`, `switch.tsx`, `label.tsx` |
| Disabled checkboxes and switches could keep their enabled appearance because their roots are spans. | Control and label use the primitives’ disabled state and dim together. | `checkbox.tsx`, `switch.tsx`, `label.tsx` |
| Long email addresses, record links, and error text could extend past their surfaces or be clipped. | Shared links, alerts, and empty states wrap long text within their container. | `text-link.tsx`, `alert.tsx`, `empty-state.tsx` |
| A long current page name could squeeze the parent breadcrumb to almost no width. The full cat name was absent from the body. | The parent breadcrumb retains its space. The cat profile shows the full name, with a wrapping colony link. | `workspace-header.tsx`, `cat-page.tsx` |
| Starting an address search moved the map down when helper text appeared. | The helper row stays in the layout, so typing and provider loading keep the map in place. | `address-search-field.tsx` |
| Selecting an address disabled its focused button, which could close the results before place details loaded. | The selected result and its loading state stay visible until the request finishes or is cancelled. | `address-search-field.tsx` |
| A tall popover could extend beyond a short screen. | Popovers scroll within the available viewport height. The last action remains reachable and dismissal returns focus. | `popover.tsx` |
| Profile used a different photo picker. The shared picker hid a full-width input only with a screen-reader class, which could still widen the page. | Profile uses `PhotoUpload`. The native file input is truly hidden; shared buttons open the picker. | `profile-screen.tsx`, `photo-upload.tsx` |
| Leaving Profile or Configuration could discard edits. | The existing discard dialog protects page navigation and reloads. Configuration keeps drafts between its own sections and warns until all changed sections are saved. Explicit sign-out can reach sign-in after the session is removed. | `discard-on-navigation.tsx`, `profile-screen.tsx`, `configuration-page.tsx` |
| Cat, colony, and task details could produce a blank browser-tab title. | Each detail title supplies one complete string to React. | Cat, colony, and task page components |
| Urgent badges failed dark-mode text contrast on card surfaces. Their translucent fill also depended on the row behind them. | Danger buttons and badges use opaque semantic surface colors. Normal and hover text contrast meet 4.5:1. | `tokens.css`, `globals.css`, `badge.tsx`, `button.tsx` |
| Native controls and browser chrome could use colors that differed from the active screen. | The theme declares its color scheme. Browser chrome follows the public/workspace background and theme class. | `tokens.css`, `App.tsx` |
| View choices could exceed the available width when text was doubled. | The shared view switcher can wrap its options. | `view-switcher.tsx` |
| Empty states and map frames had accessible names without a suitable role. | They expose named groups while retaining explicit alert/status roles where supplied. | `empty-state.tsx`, `colony-map.tsx` |

The review also repaired the isolated Directory Map story's missing workspace context. Older browser checks were updated to use the current neighborhood fixtures, map picker, result-count copy, and shared address search. No older product flow was restored for those checks.

## Validation

Focused regressions are in `tests/ui/mobile-polish.spec.ts` (26 cases across both themes). The full run and focused rechecks produced 730 distinct passing UI cases. Failures from stale fixtures, live reloads, and the issues above were repaired or rechecked. Final affected cases ran against an immutable Storybook build with no live reload. Four browser-routing checks remain skipped because they require a separate seeded-app setting; live route and sign-in flows were also checked manually. Both application and Storybook builds passed.

Accessibility checks used axe on 17 dark-theme live routes. The urgent-badge contrast failures were fixed and the affected routes were checked again. Pending and suspended account screens were also checked. Map attribution is kept intact; automated checks cannot fully assess text drawn over a third-party map canvas.

## Checks that need a physical device

Browser emulation cannot confirm the software keyboard, Safari's changing browser bars, notches and landscape safe areas, touch feel, or installed-PWA behavior. These remain real-phone checks. The review does not claim that every possible state or hardware combination is covered.
