# 0002: Separate public and workspace layouts

Date: 2026-11-07

Status: Accepted

## Context

The app needs a public entry page and a separate workspace. The user requested a shell, placeholders, and clear component boundaries before product workflows are designed.

## Decision

Use `/` for the public landing page and `/app` for the workspace overview. Keep separate `SiteLayout` and `AppLayout` components. Each layout renders its child route through an `Outlet`.

Keep reusable layouts in `src/components/layout/`, shared controls in `src/components/ui/`, feature page content in `src/features/<area>/pages/`, and cross-feature fallback pages in `src/pages/`.

The common root handles skip navigation, route focus, and scroll restoration. Unknown URLs show a not-found page inside the matching public or app layout. Unexpected route errors use a root error boundary.

## Consequences

Future product pages can nest under `/app` without inheriting the public header. Add feature routes when their scope is agreed. Planned colony, cat, and report content is informational and has no working actions yet.

Use shared theme tokens rather than defining separate layout colors. The final landing content, product navigation, authentication, and rescue workflows remain open decisions. This route split does not restrict access to the workspace.
