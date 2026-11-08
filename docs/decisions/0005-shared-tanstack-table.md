# 0005: Shared TanStack tables

Date: 2026-11-07

Status: Accepted

## Context

The Inbox needs a consistent table with sorting, pagination, selection, and clear loading and error states. Later screens should reuse this behavior and the Mews component library. The current Inbox uses local memory. There is no report API yet.

## Decision

Use `@tanstack/react-table` v9. `src/components/ui/data-table.tsx` defines a shared `createTableHook` factory, column helper, and `DataTable` component. Features own their columns, filters, stable row IDs, controlled pagination, and update actions. Shared components own visual states, keyboard controls, paging controls, and loading feedback.

The Inbox filters the complete local collection before sorting and pagination. Opening or updating a report preserves the current page. Filter changes reset the page and selection. If removing a report empties the last page, the Inbox clamps pagination to the last available page. Selected IDs can span pages in the current filtered collection. Bulk actions change read state only; they do not process reports.

Do not add TanStack Query solely to wrap this local collection. Introduce it with the first report API. Use one stable QueryClient for the signed-in app, shared transport and error handling, and feature-owned query options, keys, and mutations. Query owns server data and request state. React Router owns navigation and route access. Local drafts, open overlays, and selection remain local UI state. Avoid two independent caches for the same reports, and clear user-specific cached data at sign-out or account changes.

For server pagination, put page, filters, and sorting in the query key. Supply returned rows and total count to the same table with manual pagination, sorting, and filtering. The server must apply filtering and sorting before pagination. Keep the last successful rows visible and inactive during page requests; use Query's previous-data and prefetch APIs when this integration exists. Do not add artificial request delays to product code.

## Consequences

The application keeps its shared Mews controls and theme. TanStack supplies table behavior without imposing a new visual component library. `Display → Data table` documents ready, loading, error/retry, delayed paging, and empty states. Delayed requests exist only in Storybook. Virtualization and advanced column controls can be added when a real screen needs them.

References: [TanStack composable tables](https://tanstack.com/table/latest/docs/framework/react/guide/composable-tables), [pagination](https://tanstack.com/table/latest/docs/framework/react/guide/pagination), [Query pagination](https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries).
