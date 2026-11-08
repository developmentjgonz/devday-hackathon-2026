# Autopilot

Administrators configure autopilot in **Configuration → AI analysis**. Autopilot is off by default. A saved, readable OpenAI key is required to enable it. Removing the key pauses autopilot. Deployed demo accounts cannot enable or run it.

The Worker checks for work every five minutes. The Automation page also has a **Run now** action. Runs use a database lease to prevent overlap. A run checks up to five reports, with urgent reports first. Failed or unresolved reports wait one hour before another attempt. Changed report evidence can be checked sooner. Provider requests share the existing workspace AI rate limit.

The feature switches control these actions:

- **Review reports:** review reports and link confirmed duplicate reports. Reports stay open when evidence or a required feature is missing. Report review does not complete physical care tasks.
- **Assign tasks:** create tasks from reports and choose an active, assignable member with the fewest open tasks. Reassign open tasks whose owner is suspended or no longer accepts tasks. Existing valid assignments stay in place.
- **Update cats and colonies:** create supported records, append report observations to known cats, and fill missing colony locations from the report's confirmed map location. Existing names, birth dates, photos, and observations are preserved.
- **Merge duplicate colonies:** match normalized colony names and corroborating location evidence: the same Google place, coordinates within 100 metres, or the same nonempty address. Similar names alone do not qualify. The merge moves cats, reports, task associations, care rules, and record history in one transaction.

**Require human review** is a separate switch, shown when autopilot is enabled. It defaults to on. Proposed report changes, duplicate links, colony merges, and task reassignments enter the review queue. Approval checks the current records and enabled features before applying changes. Rejection changes no care records. An unchanged rejected report is not proposed again until its evidence changes. Turning review off releases pending proposals on the next run, with the same current-record checks.

The Automation page is available to administrators while autopilot is enabled. It shows pending reviews, the latest run, and paginated activity. The database keeps activity when autopilot is paused. Each applied domain operation writes its automation event in the same transaction as the change and the existing record history. Events retain before and after data. Failed plans and stale reviews appear in activity with a reason.

Apply migration `0034_autopilot.sql` before running the new Worker. Deploy the updated Worker configuration to install the five-minute schedule. `npm run db:migrate:local` applies the migration to the local database. The Storybook Automation examples use fictional in-memory data and never call OpenAI.

Validation uses SQLite-backed Worker integration tests and focused Storybook browser checks. Provider responses in integration tests are mocked; a live provider run needs the configured workspace key.
