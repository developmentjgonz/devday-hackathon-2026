# Community board

Active administrators open **Community board** from the workspace menu at `/app/community`.

- **Add section** creates a named section. Choose cards or a list for its posts.
- **Add post** opens a form in that section. A title and details are required. Area, schedule, and date are optional.
- **Publish post** saves the post and shows it on `/community`. The date is a display date, not a publication schedule.
- **Edit** changes the post. You can move it to another section.
- **Retire** removes the post from the public board. **Retired** shows saved retired posts. **Restore** publishes one again.
- **Edit section** changes its name or display. Sections and new posts appear in creation order.

The public page and manager use the same `CommunityBoard` component. All text, cards, controls, dialogs, feedback, and loaders use the shared components. Unsaved form changes require a discard choice when the dialog closes.

## Data and access

Migration `0031_community_board.sql` adds `community_sections` and assigns existing posts to Volunteer openings or Community news. It preserves each post's text, date, order, and published state. Apply migrations before starting the updated Worker. Local setup and re-seeding use the current section IDs.

`/api/community-board` requires an active administrator. Each write also requires a matching origin, JSON, a bounded body, and schema validation. The API returns the saved board after each write.

| Method | Path | Action |
| --- | --- | --- |
| GET | `/api/community-board` | Read sections and all posts. |
| POST | `/api/community-board/sections` | Add a section. |
| PATCH | `/api/community-board/sections/:id` | Edit a section. |
| POST | `/api/community-board/posts` | Add a published post. |
| PATCH | `/api/community-board/posts/:id` | Edit a post without changing its published state. |
| PATCH | `/api/community-board/posts/:id/status` | Retire or restore with `{ "published": false }` or `{ "published": true }`. |

Public `/api/public-content` returns public area summaries and a `board` object with `sections` and published `posts`. Retired posts do not leave the administrator API. This endpoint remains public.

## Verification

`tests/workspace/community.test.mjs` checks role and origin restrictions, persistence, section changes, validation, retire and restore, and preservation of existing records during the migration. `tests/ui/community-board.spec.ts` checks the manager flow, failed saves, unsaved changes, and member access.

Storybook **Pages → Community board** uses fictional records and an isolated memory store. It includes administrator, empty, retired, loading, failed-load, failed-save, and member-access states. The public page stories use the same section and post shape.
