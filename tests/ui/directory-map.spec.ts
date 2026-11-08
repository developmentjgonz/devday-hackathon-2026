import { expect, test } from '@playwright/test'
import { openWorkspaceNavigation } from './state-helpers'

test.beforeEach(async ({ page }) => {
  await page.route('**/images.unsplash.com/**', (route) => route.abort())
})

test('colony and cat map views follow filters and open the matching records', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('https://tiles.openfreemap.org/styles/positron', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ version: 8, sources: {}, layers: [] }),
  }))
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colonies&viewMode=story')
  await page.getByRole('searchbox', { name: 'Search colonies' }).fill('Canal')
  await page.getByRole('group', { name: 'Colony view' }).getByRole('button', { name: 'Map' }).click()
  const map = page.getByRole('region', { name: 'Colony map' })
  await expect(map.getByRole('button', { name: /Canal.*1 cat/ })).toBeVisible()
  await expect(map.getByRole('button', { name: /Riverside/ })).toHaveCount(0)
  await expect(map.locator('[data-map-status="ready"]')).toBeVisible()
  await map.getByRole('button', { name: /Canal.*1 cat/ }).click()
  await map.getByRole('link', { name: 'View colony' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Canal' })).toBeVisible()

  await (await openWorkspaceNavigation(page)).getByRole('link', { name: 'Cats', exact: true }).click()
  await page.getByRole('group', { name: 'Cat view' }).getByRole('button', { name: 'Map' }).click()
  const catMap = page.getByRole('region', { name: 'Cats by colony' })
  await expect(catMap.getByText('Markers show colony locations, not individual cat sightings.')).toBeVisible()
  await catMap.getByRole('button', { name: /Riverside.*1 cat/ }).click()
  await catMap.getByRole('link', { name: 'Pepper', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Pepper' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('new colonies without locations remain accessible from the map', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colonies&viewMode=story')
  await page.getByRole('button', { name: 'Add colony', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Add colony' })
  await dialog.getByLabel('Colony name').fill('Garden')
  await dialog.getByRole('button', { name: 'Add colony', exact: true }).click()
  await page.getByRole('group', { name: 'Colony view' }).getByRole('button', { name: 'Map' }).click()
  await expect(page.getByRole('heading', { name: 'Colonies without a location' })).toBeVisible()
  await page.getByRole('link', { name: 'Garden', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Garden' })).toBeVisible()
})
