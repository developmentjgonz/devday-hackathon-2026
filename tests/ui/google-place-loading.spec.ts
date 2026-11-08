import { expect, test } from '@playwright/test'

test('address search reserves its space and shows loading while Google responds', async ({ page }) => {
  await page.addInitScript(() => {
    class FakePlaceAutocomplete extends HTMLElement {
      constructor() {
        super()
        this.style.display = 'block'
        this.style.height = '48px'
      }
    }
    customElements.define('gmp-place-autocomplete', FakePlaceAutocomplete)
    const places = new Promise((resolve) => window.addEventListener('storybook:release-places', () => resolve({ PlaceAutocompleteElement: FakePlaceAutocomplete }), { once: true }))
    Object.defineProperty(window, 'google', { value: { maps: { importLibrary: (name: string) => name === 'places' ? places : Promise.reject(new Error('Map unavailable in this test')) } } })
  })
  await page.goto('/iframe.html?id=experiments-google-maps--location-picker&viewMode=story')
  const loading = page.getByRole('status').filter({ hasText: 'Loading address search…' })
  const map = page.getByLabel('Google map', { exact: true })
  await expect(loading).toBeVisible()
  await expect(loading.locator('[data-slot="loading-indicator"]')).toBeVisible()
  const before = await map.boundingBox()
  await page.evaluate(() => window.dispatchEvent(new Event('storybook:release-places')))
  const search = page.locator('gmp-place-autocomplete')
  await expect(search).toBeVisible()
  expect((await map.boundingBox())?.y).toBeCloseTo(before!.y, 0)

  await search.evaluate((widget) => {
    const event = new Event('gmp-select')
    Object.defineProperty(event, 'placePrediction', { value: { toPlace: () => ({
      id: 'fixture', location: { toJSON: () => ({ lat: 25.79, lng: -80.24 }) }, formattedAddress: 'Sample place',
      fetchFields: () => new Promise<void>((resolve) => window.addEventListener('storybook:release-place-details', () => resolve(), { once: true })),
    }) } })
    widget.dispatchEvent(event)
  })
  const details = page.getByRole('status').filter({ hasText: 'Getting place details…' })
  await expect(details).toBeVisible()
  await expect(details.locator('[data-slot="loading-indicator"]')).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new Event('storybook:release-place-details')))
  await expect(details).toBeHidden()
  await expect(page.getByText('Location selected')).toBeVisible()
})
