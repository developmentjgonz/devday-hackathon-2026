# Mews — Team JS

Working project for the [DevDay Exchange Community Hackathon](https://deepstation.ai/hackathons/vtl7ctbeihnikitvjwl3941h), focused on the Mangrove Mews cat rescue challenge.

**Status:** The frontend foundation and a local component gallery are running. Product features and hosted services have not been implemented.

## Project guide

- [Project brief](PROJECT_BRIEF.md): the problem, intended users, and proposed scope.
- [Architecture](docs/architecture.md): directory boundaries and the agreed technology direction.
- [Roadmap](docs/roadmap.md): planned work and current progress.
- [Decision records](docs/decisions/README.md): significant choices and their reasons.
- [Component library](docs/component-library.md): where components and theme tokens live, and how to extend the gallery.
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

Open [the local component gallery](http://127.0.0.1:5197/). It shows eight component examples with search, category filters, and interactive previews. Example state is temporary.

```sh
npm run build       # Type-check and build production assets
npm run typecheck   # Type-check without bundling
npm run preview     # Serve the production build on port 4197
```

The frontend uses React, TypeScript, Vite, Tailwind CSS v4, and shadcn/ui with Base UI primitives. Theme values are stock neutral defaults in `src/styles/tokens.css`; the custom product theme is undecided. Fonts and icons are bundled dependencies.

Cloudflare API code, database migrations, and uploads remain unimplemented.

Use fictional data for this hackathon. Uploaded colony photos belong in private R2 storage once configured; they must not be placed in `public/`.
