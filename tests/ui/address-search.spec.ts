import { expect, test } from '@playwright/test'

const addresses = { type: 'FeatureCollection', features: [
  { type: 'Feature', properties: { name: '701 Brickell Avenue', city: 'Miami', state: 'Florida', country: 'United States' }, geometry: { type: 'Point', coordinates: [-80.189696, 25.767088] } },
  { type: 'Feature', properties: { name: 'Brickell City Centre', city: 'Miami', state: 'Florida', country: 'United States' }, geometry: { type: 'Point', coordinates: [-80.192912, 25.767392] } },
] }

test.beforeEach(async ({ page }) => {
  await page.route('**/images.unsplash.com/**', (route) => route.abort())
  await page.route('https://tiles.openfreemap.org/styles/positron', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ version: 8, sources: {}, layers: [] }),
  }))
})

test('searching and choosing an address places a pin that can be adjusted before saving', async ({ page }) => {
  let requests = 0
  await page.route('https://photon.komoot.io/api?*', (route) => {
    requests += 1
    const url = new URL(route.request().url())
    expect(url.searchParams.get('q')).toBe('701 Brickell Avenue, Miami')
    expect(url.searchParams.has('lat')).toBe(false)
    expect(url.searchParams.has('lon')).toBe(false)
    return route.fulfill({ json: addresses })
  })
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colonies&viewMode=story')
  await page.getByRole('button', { name: 'Add colony', exact: true }).click()
  const add = page.getByRole('dialog', { name: 'Add colony' })
  await add.getByLabel('Colony name').fill('Garden')
  await add.getByRole('button', { name: 'Add location (optional)' }).click()
  const search = add.getByLabel('Search for an address or place')
  await search.fill('701 Brickell Avenue, Miami')
  expect(requests).toBe(0)
  await search.press('Enter')
  await expect(add).toBeVisible()
  const results = add.getByRole('list', { name: 'Address search results' })
  await expect(results.getByText('Miami, Florida, United States').first()).toBeVisible()
  await results.getByRole('button', { name: /701 Brickell Avenue/ }).click()
  await expect(add.getByLabel('Latitude')).toHaveValue('25.767088')
  await expect(add.getByLabel('Longitude')).toHaveValue('-80.189696')
  await expect(results).toHaveCount(0)
  const map = add.locator('[data-location-map-status="ready"] canvas')
  await expect(map).toBeVisible()
  await map.click({ position: { x: 100, y: 90 } })
  await expect(add.getByLabel('Latitude')).not.toHaveValue('25.767088')
  await add.getByRole('button', { name: 'Add colony', exact: true }).click()
  await page.getByRole('link', { name: 'Garden', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Edit location' })).toBeVisible()
})

test('address search works when editing a colony and preserves the existing pin until a result is selected', async ({ page }) => {
  await page.route('https://photon.komoot.io/api?*', (route) => route.fulfill({ json: addresses }))
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colony&viewMode=story')
  await page.getByRole('button', { name: 'Edit location' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit location' })
  const original = await edit.getByLabel('Latitude').inputValue()
  await edit.getByLabel('Search for an address or place').fill('Brickell, Miami')
  await edit.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(edit.getByLabel('Latitude')).toHaveValue(original)
  await edit.getByRole('list', { name: 'Address search results' }).getByRole('button', { name: /Brickell City Centre/ }).click()
  await expect(edit.getByLabel('Latitude')).toHaveValue('25.767392')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await edit.getByRole('button', { name: 'Save location' }).click()
  await expect(page.getByRole('region', { name: 'Location' }).getByText('25.76739, -80.19291')).toBeVisible()
})

test('no matches and service errors leave the map and coordinate fields usable', async ({ page }) => {
  await page.route('https://photon.komoot.io/api?*', (route) => {
    const query = new URL(route.request().url()).searchParams.get('q')
    return query === 'not found' ? route.fulfill({ json: { features: [] } }) : route.fulfill({ status: 503, body: 'Unavailable' })
  })
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colony&viewMode=story')
  await page.getByRole('button', { name: 'Edit location' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit location' })
  const search = edit.getByLabel('Search for an address or place')
  await search.fill('not found')
  await edit.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(edit.getByText('No matching addresses')).toBeVisible()
  await search.fill('unavailable')
  await edit.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(edit.getByRole('alert')).toContainText('Address search unavailable')
  await edit.getByLabel('Latitude').fill('25.8')
  await edit.getByLabel('Longitude').fill('-80.2')
  await edit.getByRole('button', { name: 'Save location' }).click()
  await expect(page.getByRole('region', { name: 'Location' }).getByText('25.80000, -80.20000')).toBeVisible()
})

test('editing the search cancels an older request', async ({ page }) => {
  await page.route('https://photon.komoot.io/api?*', async (route) => {
    const query = new URL(route.request().url()).searchParams.get('q')
    if (query === 'old address') await new Promise((resolve) => setTimeout(resolve, 1200))
    await route.fulfill({ json: query === 'new address' ? { features: [addresses.features[1]] } : { features: [addresses.features[0]] } }).catch(() => {})
  })
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colony&viewMode=story')
  await page.getByRole('button', { name: 'Edit location' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit location' })
  const search = edit.getByLabel('Search for an address or place')
  await search.fill('old address')
  await edit.getByRole('button', { name: 'Search', exact: true }).click()
  await search.fill('new address')
  await edit.getByRole('button', { name: 'Search', exact: true }).click()
  const results = edit.getByRole('list', { name: 'Address search results' })
  await expect(results.getByRole('button', { name: /Brickell City Centre/ })).toBeVisible()
  await expect(results.getByRole('button', { name: /701 Brickell Avenue/ })).toHaveCount(0)
})
