# Public reports

The landing page links to `/report`. Anyone can send a location, description, and urgency flag without signing in or giving contact details. The form accepts text only. It does not expose colony records or locations.

Submissions appear as anonymous community reports in the team's Reports inbox. Team members can create a task or link and review a report in the normal workflow. They cannot ask the sender for details because the form has no reply channel. The inbox refreshes when a team member returns to the app and at regular intervals while it is open; it does not send notifications.

The Worker validates and limits each submission, checks that it comes from the site origin, and uses the `PUBLIC_REPORT_RATE_LIMITER` binding to limit submissions per source IP. Cloudflare may still process network information under its own policies; the form does not request a name or contact information.

Before deploying this feature, apply migration `0020_anonymous_reports.sql` to the target D1 database and deploy the Worker with the new rate-limit binding. A deployment does not apply migrations automatically. Local development applies migrations during setup. No outbound alert or photo upload is included.
