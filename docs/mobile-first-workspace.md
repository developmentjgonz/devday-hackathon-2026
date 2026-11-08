# Mobile-first workspace

Goal: make the main Mews flows easy to use on a phone, with useful desktop tables.

## Design rules

- Use one page scroll for lists. Avoid a second vertical scroll inside a table.
- Show a compact row with a title, useful context, and one clear next action.
- Open details to show secondary links, editing, and full information.
- Keep photos and maps where they help identify cats or find colonies.
- Use shared components and tokens. Document new APIs in Storybook.
- Keep search, filters, sorting, loading, empty states, errors, and focus return working.
- Append more list rows without replacing the rows already on screen.

## Flow checklist

- [x] Shared list rows and incremental loading; Storybook examples.
- [x] My Tasks: scan, search, filter, open, create, edit, complete, reopen.
- [x] Reports: scan, sort, filter, open, create, review, return to list.
- [x] Colonies: list, map, record details, create, edit.
- [x] Cats: list, map, record details, create, edit.
- [x] Team: find a person, review a request, change access.
- [x] Navigation and page shell: narrow widths, scrolling, menu, details, focus.
- [x] Profile and configuration: form layout, keyboard access, save and error states.
- [x] Shared overlays: phone height, safe areas, scroll, fixed actions. Report fields and context scroll in the body; only the title and main actions stay fixed.
- [x] Focused type, build, and browser checks.
- [x] Record real-phone checks which cannot be done with browser emulation.

## Initial findings

Tasks and reports start as separate cards. Task cards repeat record links and actions. The colony list is another card layout. Cats have no list view. Team uses a desktop table at all widths. Tables use a bounded vertical scroll by default. Search and action controls can take several rows on a phone.

The app already uses client-side routes and route-based task and report panels. Keep those flows. The main change is how records are presented and how pages scroll.

Creation and editing already use shared dialogs or drawers. Review their phone layout before adding any new overlay pattern.

## Verification

Available checks are complete. App build (including typecheck), Storybook build, and focused diff checks passed.

- Phone lists, touch targets, loading actions, history, permissions, and team flows passed in light and dark themes. Tests use 320px, 390px, 768px, and desktop widths as appropriate.
- The final report group passed 92 cases: 90 in the group run, then the two existing order assertions were updated for original-report-first and passed on a focused rerun.
- The remaining task, care-rule, directory, association, and creation group passed all 60 cases against a fixed source copy.
- Earlier focused checks covered desktop sorting, paging, toolbar stability, sticky navigation, profile saves, configuration, and errors. Checks affected by later changes were repeated.
- Agent-browser checked the actual app and Storybook, captured the report flow at 30fps, and inspected the timestamped contact sheet.
- Browser checks use the secure Chrome launcher. Playwright keeps the Chromium sandbox enabled.

A real phone is still needed to check the software keyboard, Safari safe areas, sticky hover, landscape layout, overscroll feel, and installed-PWA behavior. No hardware-level performance claim is made.


## Decisions made during review

- Keep the dashboard metrics and charts; they support a quick overview.
- Keep maps and photo cards as alternate directory views.
- Keep the existing care-rule rows and shared forms; they already use page scrolling and useful actions.
- Move report matching fields out of the fixed header. Put the original submission before AI suggestions. Keep all report subflow context in the scrolling body.
- Keep desktop task cells stable while save state changes, so confirmation notes and retry controls stay open.


## Interaction recording

Recorded the production report UI in Storybook with fictional records at 390 × 844. The sequence covers opening a report, scrolling its body, creating a care task, and returning. The before recording and contact sheet are in the chat artifact folder as `mews-report-flow.mp4` and `mews-report-flow.contact-sheet.png`. The final sequence is `mews-report-flow-after.mp4` with its timestamped contact sheet. These are recordings of real interactions with the production components, not a scripted illustration.

The sequence showed an 80px header-height jump when switching from Report to Create a care task (77px to about 157px). The subflow now keeps Back and its title in one row and puts helper text in the scrolling body. The final Report and Create a care task headers both measure 77px at 390px. The unsaved-changes message is in the body, so changing a match no longer grows the footer. A 1.2-second browser frame sample around report opening found no frame gap above 34ms and no long task. This is a limited local browser check, not a real-phone performance measurement.

## Cat, colony, and task walkthroughs

Recorded real interactions with the production components in Storybook at 390 × 844 and 30fps. Records are fictional. Each flow has a before video, an after video, and a contact sheet in the chat artifact folder under `walkthroughs/`.

- `cat-after.mp4`: create Poppy, create Garden within the cat draft, save the cat, open its profile, edit its details, and save.
- `colony-after.mp4`: open Riverside, add and remove an existing cat, open the location editor, enter coordinates and a landmark, and save.
- `task-after.mp4`: create a task, open it, edit its title, complete it with a note, reopen it, and return to the list.

| Before | After | Why |
| --- | --- | --- |
| Add cat used a 201px header; its colony substep used 209px. | Both use a 77px header. Colony selection and helper text scroll in the body. | Keep more of the form visible and preserve the cat draft between steps. |
| Task details used about 57px; editing used 133px. Related names changed the header size. | Both use 77px. Related context follows the main fields in the body. | Switching views and adding related items do not move the main fields. |
| Membership and location forms used 133px headers. Membership actions could lose focus or force a scroll. | Headers use 77px. Focus stays inside the panel without scrolling. Success text follows the form. | Keep the user's place during repeated actions. |
| A recent success notification could cover Save when the next editor opened. | The shared notification host measures the open drawer footer and places notifications above it. | Keep fixed actions available while confirmations remain visible. |

The new layout checks cover 320px and 390px, light and dark themes, long names, cat draft retention, stable task field positions, membership focus, and return to the same page position. Notification checks also cover desktop width. App and Storybook builds passed. Real-phone checks remain as listed above.


## Flow review

| Flow | Final decision |
| --- | --- |
| My Tasks | Compact phone feed; desktop table; task details hold secondary actions. Keep confirmation, completion notes, Undo, and retry. |
| Reports | Original submission first. Matching fields, helper text, and subflow context scroll. Keep a compact title bar and fixed main actions. |
| Cats and colonies | Start with compact lists. Keep photo cards and maps as useful alternate views. Use phone rows for cats and tasks inside colony records. |
| Team | Phone rows open account details. Desktop retains columns. Keep approval, assignment availability, and access controls. |
| Navigation | One mobile header. Keep existing route-based panels, browser history, focus return, and the page behind details. |
| Overview | Retain summary counts and charts; they support quick review. |
| Profile and configuration | Retain shared forms and their save/error states. Configuration sections use a horizontal strip on phones. |
| Care schedules and timeline | Retain existing divided rows, repeating-task controls, and history. Open a task to manage it. |
| Shared controls | Use 44px compact touch targets, 16px phone fields, viewport resizing, safe-area padding, and contained overlay scrolling. |
