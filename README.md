# Mews — Team JS

Mews is Team JS's project for the [DevDay Exchange Community Hackathon](https://deepstation.ai/hackathons/vtl7ctbeihnikitvjwl3941h). We have chosen the **Mangrove Mews cat colony tracking challenge**.

The project aims to help cat rescue coordinators and volunteers track colonies, cats, feeding visits, and care needs in one place. The project direction is confirmed; the first user flow and MVP scope still need to be agreed. Mews remains the working name.

**Status:** The local app has a public landing placeholder at `/` and a workspace shell at `/app`. Storybook provides the separate component workspace. The Cloudflare Worker serves the last deployed frontend and a health API connected to an empty D1 database. No rescue workflows or sign-in are implemented.

## Cloudflare deployment

| Service | URL or resource | Purpose |
| --- | --- | --- |
| Live app | [devday-js-2026.deal-finder.workers.dev](https://devday-js-2026.deal-finder.workers.dev/) | Cloudflare Worker serves the deployed frontend assets. Local changes need a separate deployment. |
| API health | [/api/health](https://devday-js-2026.deal-finder.workers.dev/api/health) | Checks the D1 connection with a read-only query. |
| Worker dashboard | [devday-js-2026](https://dash.cloudflare.com/d4501cb4c3a0ec6b4b67b051d83d3a30/workers/services/view/devday-js-2026/production) | Manage the Worker deployment. |
| D1 dashboard | [devday-js-2026-db](https://dash.cloudflare.com/d4501cb4c3a0ec6b4b67b051d83d3a30/workers/d1/databases/5e49e8ba-625a-4954-9ebc-10d7f3100b90) | Manage the database, bound to the Worker as `DB`. |
| Build and deployment runs | [GitHub Actions](https://github.com/developmentjgonz/devday-hackathon-2026/actions/workflows/cloudflare.yml) | View build checks and release deployment results. |

Cloudflare dashboard links require an account with access to these resources. The app and health URLs are public.

Pushes to `main` run checks. Pushes to `release` run checks and deploy to the live URL. Pull requests to either branch run checks only. See the [workflow](.github/workflows/cloudflare.yml), [Cloudflare configuration](wrangler.jsonc), and [infrastructure guide](docs/infrastructure.md) for setup and deployment details.

Storybook runs locally and is not deployed. Product tables, migrations, and uploads remain unimplemented.

## Project guide

- [Project brief](PROJECT_BRIEF.md): the problem, intended users, and proposed scope.
- [Architecture](docs/architecture.md): directory boundaries and the agreed technology direction.
- [Roadmap](docs/roadmap.md): planned work and current progress.
- [Decision records](docs/decisions/README.md): significant choices and their reasons.
- [Component library](docs/component-library.md): where components and theme tokens live, and how to extend the gallery.
- [Infrastructure](docs/infrastructure.md): dedicated Cloudflare resources, deployment, and health checks.
- [Local skills](.agents/skills/README.md): installed guidance and source revisions.
- [Feature map](.agents/skills/verify-mews/references/features/README.md): implemented user-visible behavior and verification notes.

## Directory boundaries

| Directory | Responsibility |
| --- | --- |
| `src/` | React frontend, with related UI grouped under `features/` |
| `src/components/layout/` | Public and workspace layouts, sidebar, and skip link |
| `src/components/ui/` | Shared shadcn and Base UI controls, with component stories |
| `src/features/<area>/pages/` | Feature page content, starting with landing and overview |
| `src/pages/` | Cross-feature not-found and route-error pages |
| `worker/` | Cloudflare API routes, application services, and database queries |
| `shared/` | Validation schemas and types shared across the API boundary |
| `migrations/` | Versioned D1 database schema changes |
| `public/` | Public static frontend assets |
| `tests/` | Unit, integration, and user-journey tests, plus fictional fixtures |
| `docs/` | Architecture, plans, and decision records |
| `.agents/skills/` | Agent instructions and their supporting references |

Empty implementation folders contain `.gitkeep` so Git can preserve the reviewed structure. Replace each marker when its folder receives a real file.

## Local development

Use Node.js 24 (see `.nvmrc`).

```sh
npm ci
npm run dev
```

Open [the landing page](http://127.0.0.1:5197/) or [the workspace](http://127.0.0.1:5197/app). Both show placeholder content. Unknown workspace URLs keep the app shell and provide a link back to the overview.

Start the component workspace separately:

```sh
npm run storybook
```

Open [Storybook](http://127.0.0.1:6006/) to browse components, change their controls, and read their generated documentation. Stories use temporary sample state.

```sh
npm run build       # Type-check and build production assets
npm run typecheck   # Type-check without bundling
npm run preview     # Serve the production build on port 4197
npm run build-storybook # Build the separate component workspace
```

The frontend uses React, TypeScript, Vite, React Router in Data Mode, Tailwind CSS v4, and shadcn/ui with Base UI primitives. Public and workspace layouts have separate route branches. Product feature routes remain undecided. The Warm Company theme lives in `src/styles/tokens.css`; both shells use the shared theme. Storybook includes loading stages, spinner, paw and fire loaders, skeletons, and typography. Fonts and icons are bundled dependencies.

React Doctor is installed as a development dependency for manual checks only:

```sh
npm exec -- react-doctor
```

It is not connected to package scripts, builds, hooks, or CI. Run it only when a review is wanted. See the [CLI reference](https://www.react.doctor/docs/reference/cli-reference).

Use fictional data for this hackathon. Uploaded colony photos belong in private R2 storage once configured; they must not be placed in `public/`.
