import { expect, test } from '@playwright/test'

test('a focus refresh finds new reports', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-reports--incoming-report&viewMode=story', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'All reports reviewed' })).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByRole('button', { name: 'Review New feeding update' })).toBeVisible()
})

test('a stale refresh cannot undo a read update', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-reports--stale-refresh&viewMode=story', { waitUntil: 'domcontentloaded' })
  const report = page.getByRole('button', { name: 'Review Orange cat by the Canal entrance' })
  await expect(report).toHaveAccessibleDescription('Unread report')
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await report.click()
  await page.getByRole('button', { name: 'Close report' }).click()
  await expect(report).not.toHaveAccessibleDescription('Unread report')
  await page.waitForTimeout(1900)
  await expect(report).not.toHaveAccessibleDescription('Unread report')
})
