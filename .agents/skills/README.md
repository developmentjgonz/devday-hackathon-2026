# Repository skills

These six skills are installed for this repository in `.agents/skills/`. Each skill's `SKILL.md` describes when to use it. Supporting references stay alongside the skill.

| Skill | Purpose | Source |
| --- | --- | --- |
| [cloudflare-deploy](cloudflare-deploy/SKILL.md) | Cloudflare Workers, D1, R2, and deployment guidance | [OpenAI](https://github.com/openai/skills) |
| [security-best-practices](security-best-practices/SKILL.md) | Explicit security reviews and secure coding guidance | [OpenAI](https://github.com/openai/skills) |
| [emil-design-eng](emil-design-eng/SKILL.md) | Interface details, interaction design, and motion | [Emil Kowalski](https://github.com/emilkowalski/skills) |
| [vercel-react-best-practices](vercel-react-best-practices/SKILL.md) | React performance, data fetching, and rendering | [Vercel](https://github.com/vercel-labs/agent-skills) |
| [vercel-composition-patterns](vercel-composition-patterns/SKILL.md) | Reusable React component APIs and composition | [Vercel](https://github.com/vercel-labs/agent-skills) |
| [web-design-guidelines](web-design-guidelines/SKILL.md) | Interface accessibility and usability reviews | [Vercel](https://github.com/vercel-labs/agent-skills) |

## Project context

The agreed direction is Vite, React, and TypeScript, with Cloudflare Workers for the API, D1 for relational data, and R2 for files as those features are introduced. Apply guidance that fits this stack. Next.js-specific examples do not require adding Next.js, and Vercel-authored guidance does not require hosting on Vercel.

Emil's upstream repository contains several separate skills. Only the main `emil-design-eng` skill is installed here.

Work proceeds in small steps with the user. Keep changes local and uncommitted, and do not push or submit the hackathon project until the user asks.

## Sources and updates

Installed on November 7, 2026, from the then-current default-branch revisions of the upstream repositories. [sources.json](sources.json) records the exact commits, upstream paths, and installed content hashes.

These are snapshots; upstream updates are not installed automatically. To update, inspect upstream changes, use the skill installer with this repository's `.agents/skills/` as its destination, and refresh the source record. Preserve upstream license files. The web-design-guidelines skill separately fetches its latest review rules when invoked, as its own instructions specify.

Codex discovers repository skills from `.agents/skills/`. Installed skills should be available on the next turn.
