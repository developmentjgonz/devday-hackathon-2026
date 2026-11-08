import { expect, test } from '@playwright/test'
test.setTimeout(60000)

for (const view of ['cards', 'list'] as const) {
  test(`${view} reopening a task shows loading and prevents another activation`, async ({ page }) => {
    await page.goto('/iframe.html?id=pages-my-tasks--delayed-task-status&viewMode=story')
    if (view === 'list') await page.getByRole('button', { name: 'List', exact: true }).click()
    await page.getByLabel('Filter tasks by status').selectOption('completed')
    const reopen = page.getByRole('button', { name: 'Reopen task: Confirm evening cover' })
    await reopen.click()
    await expect(reopen).toHaveAttribute('aria-busy', 'true')
    await expect(reopen).toBeDisabled()
    await expect(reopen.locator('[data-slot="loading-indicator"]')).toBeVisible()
    await page.evaluate(() => window.dispatchEvent(new Event('storybook:release-task-status')))
    await expect(page.getByText('Task reopened', { exact: true })).toBeVisible()
    await page.getByLabel('Filter tasks by status').selectOption('open')
    await expect(page.getByRole('button', { name: 'Complete task: Confirm evening cover' })).toBeVisible()
  })
}

test('a failed reopen clears the loading state and allows retry', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-my-tasks--failed-task-status&viewMode=story')
  await page.getByLabel('Filter tasks by status').selectOption('completed')
  const reopen = page.getByRole('button', { name: 'Reopen task: Confirm evening cover' })
  await reopen.click()
  await expect(reopen).toHaveAttribute('aria-busy', 'true')
  await page.evaluate(() => window.dispatchEvent(new Event('storybook:release-task-status')))
  await expect(page.getByText('Could not reopen the task. Try again.')).toBeVisible()
  await expect(reopen).toBeEnabled()
  await expect(reopen).not.toHaveAttribute('aria-busy', 'true')
})

test('undo shows the shared loading toast while the task is reopened', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-my-tasks--delayed-task-status&viewMode=story')
  await page.getByRole('button', { name: 'Complete task: Arrange a care check' }).click()
  const confirm = page.getByRole('dialog', { name: 'Complete this task?' }).getByRole('button', { name: 'Complete task' })
  await confirm.click()
  await expect(confirm).toHaveAttribute('aria-busy', 'true')
  await page.evaluate(() => window.dispatchEvent(new Event('storybook:release-task-status')))
  await page.getByRole('button', { name: 'Undo' }).click()
  const notice = page.locator('[data-sonner-toast]').filter({ hasText: 'Reopening task…' })
  await expect(notice).toBeVisible()
  await expect(notice.locator('[data-slot="loading-indicator"]')).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new Event('storybook:release-task-status')))
  await expect(page.getByRole('button', { name: 'Complete task: Arrange a care check' })).toBeVisible()
})
