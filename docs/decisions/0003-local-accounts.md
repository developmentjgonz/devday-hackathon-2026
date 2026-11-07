# 0003: Local accounts with separate identity, approval, and role

Date: 2026-11-07

Status: Accepted

## Context

The user requested local test sign-in and a seeded administrator before connecting Google. New users must wait for approval; phone is optional. Google and administrator management screens are outside this step.

## Decision

Use D1 users and server sessions. Store provider identities separately so Google can be added later without replacing account approval and role checks.

Start with administrator and member roles, and pending, active, and suspended statuses. The server assigns new users the member role and pending status. Additional role permissions remain open.

Seed a fictional administrator, active member, pending member, and suspended member. Keep seeds outside migrations and preserve existing data on repeated setup. Local signup can add more pending users.

Test sign-in requires an explicit server setting and an HTTP localhost address. All accounts use the same server session and access checks. Identity, status, and roles are never browser-local flags.

## Consequences

Developers can test signup, approval, suspension, expiry, and logout without Google credentials. Protected APIs check the current user on each request. Frontend loaders redirect users to sign-in or account status.

Production has no sign-in provider yet. Production schema, administrator setup, and Google credentials require a later step. Local setup does not change the remote database or deploy the app.

See [local accounts](../local-accounts.md).
