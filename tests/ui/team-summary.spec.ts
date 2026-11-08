import { expect, test } from '@playwright/test'

test('the home summary updates after a task is completed', async ({ page }) => {
  await page.route('**/images.unsplash.com/**', (route) => route.abort())
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colonies&viewMode=story')
  const nav = page.getByRole('navigation', { name: 'Workspace navigation' })
  await nav.getByRole('link', { name: 'Overview', exact: true }).click()
  const openTasks = page.getByRole('list', { name: 'Colony summary' }).getByRole('listitem').filter({ hasText: 'Open tasks' }).locator('[data-slot="text"]').last()
  const initialCount = Number(await openTasks.innerText())
  await page.getByRole('link', { name: 'View my tasks' }).click()
  await page.getByRole('button', { name: /^Complete task:/ }).first().click()
  await page.getByRole('dialog', { name: 'Complete this task?' }).getByRole('button', { name: 'Complete task', exact: true }).click()
  await nav.getByRole('link', { name: 'Overview', exact: true }).click()
  await expect(openTasks).toHaveText(String(initialCount - 1))
})
