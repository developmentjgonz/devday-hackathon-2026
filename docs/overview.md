# Overview

Overview contains three progress cards and a team completion chart. It has no Care progress title, task list, or Team summary. My tasks links to `/app/tasks`; Report reviews links to `/app/reports`. Task lists, report lists, and directory inventory belong on their own pages.

Personal task completion uses the signed-in user's stable ID. Team task completion counts all workspace tasks. Report processing remains separate from task completion. These totals update from workspace state after completion, Undo, reopening, or review. They do not claim weekly output, streaks, or historical trends. Due and overdue counts use America/New_York and exclude completed tasks. Empty totals show a dash in the shared ProgressRing and readable text.

The team chart groups completed tasks by their current assignee, not necessarily the person who marked them complete. Names are in alphabetical order, and the largest count sets the bar scale. Each count is shown as text. The chart and thank-you message update when task status or assignment changes. No completed tasks shows an empty state. Local seeds include fictional completed tasks for the two active local accounts; re-seeding preserves subsequent edits.

The shared Card, ProgressRing, BarChart, Heading, Text, and TextLink components own appearance. Feedback → Progress ring documents zero, partial, and complete totals; Display → Bar chart documents comparison and long-label states. Storybook uses isolated fictional records; production reads the workspace provider.

The card structure draws on [ClickUp member progress](https://mobbin.com/screens/caed8962-b58e-4c18-9391-13df63797c66) and [Wrike review status](https://mobbin.com/screens/d750f820-568f-4a4f-8540-1692449871de). The user chose to keep full task and report lists off Overview.
