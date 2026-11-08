import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }, info) => {
  await page.addInitScript((dark) => {
    document.addEventListener('DOMContentLoaded', () => document.documentElement.classList.toggle('dark', dark))
  }, info.project.name === 'dark')
})

test('the demonstration can stop at its result and replay', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/iframe.html?id=stories-report-to-care-task--walkthrough&viewMode=story')
  const stage = page.locator('.ss-stage')
  await expect(stage).toHaveAttribute('data-layout', 'compact', { timeout: 15_000 })
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
  await expect(stage).toHaveAttribute('data-still', 'true', { timeout: 15_000 })
  await expect(stage.locator('.mews-stage-view[data-active]')).toContainText('Arrange a care check')
  async function contrast(textSelector: string, backgroundSelector: string) {
    return stage.locator(textSelector).first().evaluate((text, selector) => {
      const background = document.querySelector(selector)
      if (!background) throw new Error(`Background is missing: ${selector}`)
      function luminance(color: string) {
        const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number)
        if (channels?.length !== 3) throw new Error(`Unsupported color: ${color}`)
        const linear = channels.map((channel) => {
          const value = channel / 255
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
        })
        return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
      }
      const values = [luminance(getComputedStyle(text).color), luminance(getComputedStyle(background).backgroundColor)].sort((a, b) => b - a)
      return (values[0] + 0.05) / (values[1] + 0.05)
    }, backgroundSelector)
  }
  expect(await contrast('.mews-stage-view[data-active] .ss-text', '.mews-stage-views')).toBeGreaterThanOrEqual(4.5)
  expect(await contrast('.mews-stage-content [data-slot=heading]', '.mews-stage-content')).toBeGreaterThanOrEqual(4.5)
  expect(await contrast('.mews-stage-nav button', '.mews-stage-header')).toBeGreaterThanOrEqual(4.5)
  expect(await contrast('.mews-stage-header > span > span', '.mews-stage-header')).toBeGreaterThanOrEqual(4.5)
  await expect(page.getByRole('button', { name: /Show result|Replay demonstration/ })).toHaveCount(0)
})

test('the walkthrough reaches the open task', async ({ page }) => {
  test.setTimeout(45_000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/iframe.html?id=stories-report-to-care-task--walkthrough&viewMode=story')
  await expect(page.getByRole('button', { name: 'Replay demonstration', exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.ss-stage .mews-stage-view[data-active]')).toContainText('Arrange a care check')
})
