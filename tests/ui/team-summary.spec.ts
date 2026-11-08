import { expect, test } from '@playwright/test'
import { confirmTaskCompletion } from './task-confirmation'

test('the team open-task count updates after a task is completed', async ({ page }) => {
  await page.route('**/images.unsplash.com/**', (route) => route.abort())
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colonies&viewMode=story')
  const nav = page.getByRole('navigation', { name: 'Workspace navigation' })
  await nav.getByRole('link', { name: 'Overview', exact: true }).click()
  const teamSummary = page.getByRole('region', { name: 'Team tasks' })
  const openTasks = teamSummary.getByText(/^\d+ open$/)
  const initialCount = Number((await openTasks.innerText()).split(' ')[0])
  await page.getByRole('region', { name: 'My tasks' }).getByRole('link', { name: 'My tasks' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'My Tasks' })).toBeVisible()
  await page.getByRole('button', { name: /^Mark complete:/ }).first().click()
  await confirmTaskCompletion(page)
  await nav.getByRole('link', { name: 'Overview', exact: true }).click()
  await expect(openTasks).toHaveText(`${initialCount - 1} open`)
})
