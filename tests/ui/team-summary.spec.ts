import { expect, test } from '@playwright/test'

test('home progress updates after a task is completed from the directory workspace', async ({ page }) => {
  await page.route('**/images.unsplash.com/**', (route) => route.abort())
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colonies&viewMode=story')
  const nav = page.getByRole('navigation', { name: 'Workspace navigation' })
  await nav.getByRole('link', { name: 'Overview', exact: true }).click()
  const teamProgress = page.getByRole('progressbar', { name: 'Team task completion' })
  const initialCount = Number(await teamProgress.getAttribute('aria-valuenow'))
  await page.getByRole('link', { name: 'View my tasks' }).click()
  await page.getByRole('button', { name: /^Complete task:/ }).first().click()
  await page.getByRole('dialog', { name: 'Complete this task?' }).getByRole('button', { name: 'Complete task', exact: true }).click()
  await nav.getByRole('link', { name: 'Overview', exact: true }).click()
  await expect(teamProgress).toHaveAttribute('aria-valuenow', String(initialCount + 1))
})
