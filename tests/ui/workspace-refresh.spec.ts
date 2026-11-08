import { expect, test } from '@playwright/test'

test('a focus refresh finds new reports', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-reports--incoming-report&viewMode=story', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'No reports need review' })).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByRole('button', { name: 'Review New feeding update' })).toBeVisible()
})

test('a stale refresh cannot undo a completed review', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-reports--stale-refresh&viewMode=story', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Filter by status').selectOption('all')
  const report = page.getByRole('button', { name: 'Review Orange cat by the Canal entrance' })
  const row = page.getByRole('row').filter({ has: report })
  await expect(row).toContainText('Needs review')
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await report.click()
  await page.getByRole('button', { name: 'Save and finish' }).click()
  await expect(row).toContainText('Reviewed')
  await page.waitForTimeout(1900)
  await expect(row).toContainText('Reviewed')
})
