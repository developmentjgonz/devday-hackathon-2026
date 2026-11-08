# Technical communication

Explain things in ASD-STE100 (Simplified Technical English). Use Karpathy's softer version: about 80% of the way to ASD-STE100, because the full standard is strict.

Reference: https://x.com/karpathy/status/2105819303471976479

# Application stage

This is a greenfield application with no users yet. For now, there are no backward compatibility requirements. Breaking changes are acceptable. Do not add compatibility layers, legacy support, or migration paths only to preserve earlier behavior. Prefer the simplest correct design for the current requirements.

# Product interface and shared components

- Treat every product page as a finished, user-facing screen from the start.
- Use the shared Storybook components and brand assets on every page, including landing, tracker, dashboard, and account pages.
- Page code may control layout, spacing, and content. Do not override shared component fonts, sizes, colors, borders, radii, or interaction styles in page CSS or utility classes unless the user explicitly requests an exception.
- Add needed visual variants to the shared component API and document them in Storybook. Do not use descendant selectors to restyle component internals.
- Use `Button` or a documented shared action component for clickable controls, `Card` for card surfaces, `Heading` and `Text` for visible typography, and `EmptyState` for no-results and unavailable-content messages. Use shared size, tone, weight, render, and action APIs; do not copy their markup or add local appearance variants. Keep third-party renderer attribution intact.
- Do not put preview, sample-data, placeholder, roadmap, or implementation commentary in product screens. Keep fixture and integration notes in Storybook Docs and repository documentation. Do not claim that fixture data is live.
- Add controls only when they support a clear user task. Avoid decorative chips, redundant filters, repeated calls to action, and buttons without useful behavior.
- Every indeterminate loader uses the shared `LoadingIndicator` cat prints. Every loading action uses `Button loading`. Keep graphic size, color, timing, and motion in the shared components and tokens; do not add local spinners, loader icons, animations, or descendant overrides. Playback controls belong only in Storybook. Keep brand details relevant to cat care.
- On the landing page, the public colony tracker is an in-page section. Tracker links scroll to `#tracker`; team-only views stay behind authentication.

# Agent-led UI exploration

Use `agent-browser` when a change needs a browser check to verify its appearance or behavior. Check the affected app or Storybook UI, as appropriate, and keep the check focused. Do not open a browser for changes that can be verified without one.

# Efficient verification

- Match verification to the size and risk of the change. A quick review is often enough for a small, reversible edit. Run automated tests when they are needed to verify the change or when the user requests them. Do not add tests that only repeat the implementation.
- Group related changes and run the relevant focused checks once, after the changes are ready. Do not run a full suite or repeat a build for every small edit.
- Run broader checks for large or high-risk changes, or when the user asks for them. Re-run only checks affected by later code changes or failures.
- If a development server restarts or a test environment fails, retry only the affected check when useful. Do not repeat checks that already passed.

# Local browser security

For local Chromium automation, use `/Users/admin/.local/bin/eday-secure-chrome` and Playwright `chromiumSandbox: true`. The launcher checks the browser security baseline and rejects sandbox-disabling flags. Playwright MCP/CLI defaults are in `/Users/admin/.config/eday-browser/playwright.json`; agent-browser has the same launcher configured globally. Direct Playwright library calls need explicit launch options. Do not reinstall or use the quarantined old bundled Chromium builds to work around launch failures. Use a patched browser with sandboxing enabled instead. These defaults are safeguards, not an OS-enforced isolation boundary.
