# Overview

Overview contains three summary cards and a team completion chart. My tasks links to `/app/tasks`; Report reviews links to `/app/reports`. Task lists, report lists, and directory inventory belong on their own pages.

The task cards show the number of open tasks and the number of tasks completed during the last 30 days. Personal counts use the signed-in user's stable ID; team counts cover all workspace tasks. Team assignees are members with open tasks. Due and overdue counts use America/New_York and exclude completed tasks. Report reviews show pending reports and reports waiting for details separately. All counts update after task or report changes.

Completion counts use a rolling 30-day window and include only tasks that are currently completed and have a recorded completion date. Reopening a task clears that date; completing it again records a new one. Tasks completed before dates were recorded are excluded because their completion date is unknown; the cards show how many dates are unavailable. The team chart uses the same window and groups tasks by their current assignee, not necessarily the person who marked them complete. Names are in alphabetical order, and the largest count sets the bar scale. Each count is shown as text. The chart and thank-you message update when task status or assignment changes. An empty state appears when there are no recorded recent completions.

The shared Card, BarChart, Heading, and Text components own appearance. Display → Bar chart documents comparison and long-label states. Storybook uses isolated fictional records; production reads the workspace provider.

The original card structure drew on [ClickUp member progress](https://mobbin.com/screens/caed8962-b58e-4c18-9391-13df63797c66) and [Wrike review status](https://mobbin.com/screens/d750f820-568f-4a4f-8540-1692449871de).
