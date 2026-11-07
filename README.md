# Mews — Team JS

Working project for the [DevDay Exchange Community Hackathon](https://deepstation.ai/hackathons/vtl7ctbeihnikitvjwl3941h), focused on the Mangrove Mews cat rescue challenge.

**Status:** Repository structure and planning. The application has not been initialized, and no services have been provisioned.

## Project guide

- [Project brief](PROJECT_BRIEF.md): the problem, intended users, and proposed scope.
- [Architecture](docs/architecture.md): directory boundaries and the agreed technology direction.
- [Roadmap](docs/roadmap.md): planned work and current progress.
- [Decision records](docs/decisions/README.md): significant choices and their reasons.
- [Local skills](.agents/skills/README.md): installed guidance and source revisions.
- [Feature map](.agents/skills/verify-mews/references/features/README.md): reserved for user flows as they become implemented and verifiable.

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

The next setup step is initializing Vite, React, and TypeScript. Run and build commands will be documented after they exist. Cloudflare configuration, API code, database migrations, and uploads will be introduced as their features are built.

Use fictional data for this hackathon. Uploaded colony photos belong in private R2 storage once configured; they must not be placed in `public/`.
