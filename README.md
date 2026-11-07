# Mews — Team JS

Working project for the [DevDay Exchange Community Hackathon](https://deepstation.ai/hackathons/vtl7ctbeihnikitvjwl3941h), focused on the Mangrove Mews cat rescue challenge.

**Status:** The main app is a minimal Hello shell. Storybook provides the separate component workspace. The deployed Cloudflare Worker serves the shell and a health API connected to an empty D1 database. No rescue workflows are implemented.

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

Open [the local app](http://127.0.0.1:5197/). It displays only Hello.

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

The frontend uses React, TypeScript, Vite, Tailwind CSS v4, and shadcn/ui with Base UI primitives. Theme values are stock neutral defaults in `src/styles/tokens.css`; the custom product theme is undecided. Fonts and icons are bundled dependencies.

The [deployed app](https://devday-js-2026.deal-finder.workers.dev/) displays the same Hello shell. [API health](https://devday-js-2026.deal-finder.workers.dev/api/health) checks the bound D1 database with a read-only query. Product tables, migrations, and uploads remain unimplemented. Storybook is a separate build and is not deployed with the app.

Use fictional data for this hackathon. Uploaded colony photos belong in private R2 storage once configured; they must not be placed in `public/`.
