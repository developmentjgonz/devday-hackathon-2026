# Project brief

## Confirmed

- Team: JS
- Event: DevDay Exchange Community Hackathon
- Challenge: Mangrove Mews cat colony tracking
- Technology direction: Vite, React, TypeScript, and Cloudflare Workers, D1, and R2
- Stage: Repository structure; no application implementation yet

## Problem and users

Volunteer reports arrive as messages, photos, and locations. The rescue coordinator spends time reconciling those updates, cats may be counted twice, and urgent needs can be missed. Mangrove Mews is a fictional rescue used by the challenge.

The intended users are volunteer feeders reporting from phones and rescue coordinators reviewing the colony census and outstanding needs.

## Decisions to make

- **Name:** Mews is the scaffold's working label; a final project name has not been chosen.
- **MVP:** Agree on the first user flow and its exact success criteria.
- **Intake:** Choose the first supported report format.
- **Identity:** Decide how members sign in and obtain access to a rescue's data.
- **Data model:** Entities, fields, and relationships have not been designed.
- **AI:** Specific model behavior, integrations, and review flows have not been designed.
- **Demo:** The demonstration flow has not been chosen.

## Challenge constraints

- Keep reporting practical on a phone in one or two minutes.
- Restrict colony locations and feeder contact information to rescue members.
- Require human confirmation for cat-record merges and adopted or missing status changes.
- Use exported chats or intentionally submitted messages; do not scrape live WhatsApp chats.
- Use only fictional messages, photos, and locations for the hackathon.

The constraints above come from the challenge brief. They describe requirements to consider, not implemented features or an agreed implementation plan.
