import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/images.unsplash.com/**', (route) => route.abort())
})

test('the dashboard shows team totals and updates when a personal task is completed', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colonies&viewMode=story')
  await page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('link', { name: 'Overview', exact: true }).click()
  const summary = page.getByRole('list', { name: 'Colony summary' })
  const openTasks = summary.getByRole('listitem').filter({ hasText: 'Open tasks' }).locator('[data-slot="text"]').last()
  const initialCount = Number(await openTasks.innerText())
  const tasks = page.getByRole('region', { name: 'My tasks' })
  const complete = tasks.getByRole('button', { name: /^Complete task:/ }).first()
  await expect(complete).toBeVisible()
  await complete.click()
  await page.getByRole('dialog', { name: 'Complete this task?' }).getByRole('button', { name: 'Complete task', exact: true }).click()
  await expect(openTasks).toHaveText(String(initialCount - 1))
  await expect(page.getByRole('link', { name: 'View all tasks' })).toBeVisible()
})
