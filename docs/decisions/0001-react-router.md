# 0001: Use React Router in Data Mode

Date: 2026-11-07

Status: Accepted

## Context

Mews needs routing that fits the existing React, TypeScript, and Vite app. The shell and product navigation still need to be designed.

## Decision

Use React Router in Data Mode with `createBrowserRouter` and `RouterProvider`. Keep the router in `src/router.tsx`, outside the React render cycle.

This supports nested layouts, route loaders, pending states, and route error boundaries as features need them. It keeps Vite and the existing Cloudflare Worker setup.

## Consequences

The initial route at `/` renders the existing Hello page. This step adds no product pages, navigation, or visual changes. Those choices remain open for discussion.

The existing Cloudflare assets configuration uses single-page application fallback for direct links. Keep API requests separate from frontend routes.

Reference: [React Router modes](https://reactrouter.com/start/modes).
