# Project brief

## Confirmed

- Team: JS
- Event: DevDay Exchange Community Hackathon
- Challenge: Mangrove Mews cat colony tracking
- Frontend foundation: Vite, React, TypeScript, Tailwind CSS, and shadcn/ui
- Backend direction: Cloudflare Workers, D1, and R2; not implemented
- Stage: Frontend foundation and component gallery; no rescue workflows implemented

## Organizer's problem statement

Source: [the hackathon's Mangrove Mews challenge](https://deepstation.ai/hackathons/vtl7ctbeihnikitvjwl3941h?tab=problem-statements). The summary below records the organizer's scenario and requirements. Mangrove Mews is fictional; the organizers say the underlying problem comes from their survey of 14 South Florida nonprofits.

Beatriz coordinates 20 volunteers and feeders caring for 18 Miami street-cat colonies alongside her day job. Updates are scattered across messages, photos, shared locations, notes, and a spreadsheet. Reconciliation takes hours each week; duplicate sightings inflate counts, urgent needs disappear, and reliable reporting becomes difficult.

Her stated goal:

> I just want anyone on my team to know, the same day, how each colony is doing and what it needs.

### Organizer's success criteria

- A phone report reaches the correct colony and cat without manual transcription.
- A colony overview shows the census, sterilization/TNR status, veterinary needs, and latest feeding visit.
- Duplicate sightings do not inflate the census.
- Pregnancy, injury, kittens, and feeder gaps receive prompt attention.

## Decisions to make

- **Name:** Mews is the scaffold's working label; a final project name has not been chosen.
- **MVP:** Agree on the first user flow and its exact success criteria.
- **Design:** Choose the theme and custom visual system; current component previews use neutral defaults.
- **Intake:** Choose the first supported report format.
- **Identity:** Decide how members sign in and obtain access to a rescue's data.
- **Data model:** Entities, fields, and relationships have not been designed.
- **AI:** Specific model behavior, integrations, and review flows have not been designed.
- **Demo:** The demonstration flow has not been chosen.

## Challenge constraints

- Keep operating costs minimal and administration manageable for volunteers.
- Keep reporting practical on a phone in one or two minutes.
- Restrict colony locations and feeder contact information to rescue members.
- Require human confirmation for cat-record merges and adopted or missing status changes.
- Use exported chats or intentionally submitted messages; do not scrape live WhatsApp chats.
- Use only fictional messages, photos, and locations for the hackathon.

The constraints above come from the challenge brief. They describe requirements to consider, not implemented features or an agreed implementation plan.
