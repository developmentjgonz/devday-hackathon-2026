import { expect, test } from '@playwright/test'

test('the demonstration can stop at its result and replay', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/iframe.html?id=stories-report-to-care-task--walkthrough&viewMode=story')
  const stage = page.locator('.ss-stage')
  await expect(stage).toHaveAttribute('data-layout', 'compact')
  await page.getByRole('button', { name: 'Show result', exact: true }).click()
  await expect(stage).toHaveAttribute('data-still', 'true')
  await expect(stage.locator('.mews-stage-view[data-active]')).toContainText('Arrange a care check')
  await page.getByRole('button', { name: 'Replay demonstration', exact: true }).click()
  await expect(page.locator('.ss-stage')).not.toHaveAttribute('data-still', 'true')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('reduced motion presents the result without playback controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/iframe.html?id=stories-report-to-care-task--walkthrough&viewMode=story')
  const stage = page.locator('.ss-stage')
  await expect(stage).toHaveAttribute('data-still', 'true')
  await expect(stage.locator('.mews-stage-view[data-active]')).toContainText('Arrange a care check')
  await expect(page.getByRole('button', { name: /Show result|Replay demonstration/ })).toHaveCount(0)
})

test('the walkthrough reaches the open task', async ({ page }) => {
  test.setTimeout(45_000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/iframe.html?id=stories-report-to-care-task--walkthrough&viewMode=story')
  await expect(page.getByRole('button', { name: 'Replay demonstration', exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.ss-stage .mews-stage-view[data-active]')).toContainText('Arrange a care check')
})
