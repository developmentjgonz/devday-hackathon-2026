import { expect, test } from '@playwright/test'
test.setTimeout(60000)

test('profile save shows the shared loader until the save finishes', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-profile--delayed-save&viewMode=story')
  await page.getByLabel('Name', { exact: true }).fill('Maya Rivera Smith')
  const save = page.getByRole('button', { name: 'Save changes' })
  await save.click()
  await expect(save).toHaveAttribute('aria-busy', 'true')
  await expect(save.locator('[data-slot="loading-indicator"]')).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new Event('storybook:release-profile-save')))
  await expect(page.getByText('Profile saved')).toBeVisible()
  await expect(save).not.toHaveAttribute('aria-busy', 'true')
})

test('new report submission shows loading until the report is saved', async ({ page }) => {
  await page.goto('/iframe.html?id=feedback-loading-coverage--delayed-reports&viewMode=story')
  await page.getByRole('button', { name: 'New report' }).click()
  const drawer = page.getByRole('dialog', { name: 'New report' })
  await drawer.getByLabel('What happened?').fill('Fresh water delivered')
  await drawer.getByLabel('Details').fill('The bowls are full.')
  const submit = drawer.getByRole('button', { name: 'Submit report' })
  await submit.click()
  await expect(submit).toHaveAttribute('aria-busy', 'true')
  await expect(submit.locator('[data-slot="loading-indicator"]')).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  await page.evaluate(() => window.dispatchEvent(new Event('storybook:release-report-write')))
  await expect(page.getByRole('dialog', { name: 'Report', exact: true })).toBeVisible()
})

test('the Team list shows the shared loader while the first request waits', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-team--loading&viewMode=story')
  await expect(page.getByRole('status', { name: 'Loading team accounts' })).toBeVisible()
})
