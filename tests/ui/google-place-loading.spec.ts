import { expect, test } from '@playwright/test'

test('address search reserves its space and shows loading while Google responds', async ({ page }) => {
  await page.addInitScript(() => {
    const prediction = {
      placeId: 'fixture', mainText: { toString: () => 'Sample place' }, secondaryText: { toString: () => 'Miami' }, text: { toString: () => 'Sample place, Miami' },
      toPlace: () => ({
        id: 'fixture', location: { toJSON: () => ({ lat: 25.79, lng: -80.24 }) }, formattedAddress: 'Sample place, Miami',
        fetchFields: () => new Promise<void>((resolve) => window.addEventListener('storybook:release-place-details', () => resolve(), { once: true })),
      }),
    }
    const places = new Promise((resolve) => window.addEventListener('storybook:release-places', () => resolve({
      AutocompleteSessionToken: class {},
      AutocompleteSuggestion: { fetchAutocompleteSuggestions: async () => ({ suggestions: [{ placePrediction: prediction }] }) },
    }), { once: true }))
    Object.defineProperty(window, 'google', { value: { maps: { importLibrary: (name: string) => name === 'places' ? places : Promise.reject(new Error('Map unavailable in this test')) } } })
  })
  await page.goto('/iframe.html?id=experiments-google-maps--location-picker&viewMode=story')
  const search = page.getByRole('searchbox', { name: 'Search for an address or place' })
  const map = page.getByLabel('Google map', { exact: true })
  await expect(search).toBeVisible()
  const before = await map.boundingBox()
  await search.fill('Sample place')
  const loading = page.getByRole('status').filter({ hasText: 'Searching addresses…' })
  await expect(loading).toBeVisible()
  await expect(loading.locator('[data-slot="loading-indicator"]')).toBeVisible()
  expect((await map.boundingBox())?.y).toBeCloseTo(before!.y, 0)
  await page.evaluate(() => window.dispatchEvent(new Event('storybook:release-places')))
  const result = page.getByRole('button', { name: /Sample place.*Miami/ })
  await result.click()
  await expect(result).toHaveAttribute('aria-busy', 'true')
  await expect(result.locator('[data-slot="loading-indicator"]')).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new Event('storybook:release-place-details')))
  await expect(page.getByText('Location selected', { exact: true })).toBeVisible()
  await expect(search).toHaveValue('Sample place, Miami')
})
