import { expect, test } from '@playwright/test'

test('the team open-task count updates after a task is completed', async ({ page }) => {
  await page.route('**/images.unsplash.com/**', (route) => route.abort())
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colonies&viewMode=story')
  const nav = page.getByRole('navigation', { name: 'Workspace navigation' })
  await nav.getByRole('link', { name: 'Overview', exact: true }).click()
  const teamSummary = page.getByRole('region', { name: 'Team tasks' })
  const openTasks = teamSummary.getByText(/^\d+ open$/)
  const initialCount = Number((await openTasks.innerText()).split(' ')[0])
  await page.getByRole('link', { name: 'View my tasks' }).click()
  await page.getByRole('button', { name: /^Complete task:/ }).first().click()
  await page.getByRole('dialog', { name: 'Complete this task?' }).getByRole('button', { name: 'Complete task', exact: true }).click()
  await nav.getByRole('link', { name: 'Overview', exact: true }).click()
  await expect(openTasks).toHaveText(`${initialCount - 1} open`)
})
