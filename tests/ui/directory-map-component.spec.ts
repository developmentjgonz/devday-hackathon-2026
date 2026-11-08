import { expect, test } from '@playwright/test'

test('a directory map opens records for a selected colony', async ({ page }) => {
  await page.route('https://tiles.openfreemap.org/styles/positron', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ version: 8, sources: {}, layers: [] }),
  }))
  await page.goto('/iframe.html?id=pages-directory-map--cats&viewMode=story')
  const map = page.getByRole('region', { name: 'Cats by colony' })
  await expect(map.getByText('Markers show colony locations, not individual cat sightings.')).toBeVisible()
  await map.getByRole('button', { name: /Canal.*1 cat/ }).click()
  await expect(map.getByRole('link', { name: 'Miso' })).toHaveAttribute('href', '/app/cats/miso')
})
