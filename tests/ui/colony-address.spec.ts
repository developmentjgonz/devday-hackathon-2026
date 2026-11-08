import { expect, test } from '@playwright/test'

const nearby = { type: 'FeatureCollection', features: [
  { type: 'Feature', properties: { housenumber: '701', street: 'Brickell Avenue', city: 'Miami', state: 'Florida', country: 'United States' }, geometry: { type: 'Point', coordinates: [-80.189696, 25.767088] } },
] }

test.beforeEach(async ({ page }) => {
  await page.route('**/images.unsplash.com/**', (route) => route.abort())
  await page.route('https://tiles.openfreemap.org/styles/positron', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: 8, sources: {}, layers: [] }) }))
})

test('a searched address is saved with a newly created colony', async ({ page }) => {
  await page.route('https://photon.komoot.io/api?*', (route) => route.fulfill({ json: nearby }))
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colonies&viewMode=story')
  await page.getByRole('button', { name: 'Add colony', exact: true }).click()
  const add = page.getByRole('dialog', { name: 'Add colony' })
  await add.getByLabel('Colony name').fill('Garden')
  await add.getByRole('button', { name: 'Add location (optional)' }).click()
  await add.getByLabel('Search for an address or place').fill('701 Brickell Avenue, Miami')
  await add.getByRole('list', { name: 'Address search results' }).getByRole('button', { name: /701 Brickell Avenue/ }).click()
  await add.getByRole('button', { name: 'Add colony', exact: true }).click()
  await page.getByRole('link', { name: 'Garden', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Location' }).getByText('701 Brickell Avenue, Miami, Florida, United States')).toBeVisible()
})

test('an address can be found for an existing pin and saved on the colony profile', async ({ page }) => {
  let lookups = 0
  await page.route('https://photon.komoot.io/reverse?*', (route) => { lookups += 1; return route.fulfill({ json: nearby }) })
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colony&viewMode=story')
  const location = page.getByRole('region', { name: 'Location' })
  await expect(location.getByText('25.81200, -80.24900')).toBeVisible()
  expect(lookups).toBe(0)
  await location.getByRole('button', { name: 'Edit location' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit location' })
  await edit.getByText('Coordinates and address details').click()
  await edit.getByRole('button', { name: 'Find nearby address' }).click()
  await expect(edit.getByLabel('Saved address or landmark (optional)')).toHaveValue('701 Brickell Avenue, Miami, Florida, United States')
  expect(lookups).toBe(1)
  await edit.getByRole('button', { name: 'Save location' }).click()
  await expect(location.getByText('701 Brickell Avenue, Miami, Florida, United States')).toBeVisible()
  await expect(location.getByText('25.81200, -80.24900')).toHaveCount(0)
  await location.getByRole('button', { name: 'Edit location' }).click()
  await edit.getByText('Coordinates and address details').click()
  await expect(edit.getByLabel('Saved address or landmark (optional)')).toHaveValue('701 Brickell Avenue, Miami, Florida, United States')
  await edit.getByLabel('Saved address or landmark (optional)').fill('Behind the garden, Miami')
  await edit.getByRole('button', { name: 'Save location' }).click()
  await expect(location.getByText('Behind the garden, Miami')).toBeVisible()
})

test('a moved pin does not keep the previous address', async ({ page }) => {
  await page.route('https://photon.komoot.io/reverse?*', (route) => route.fulfill({ json: nearby }))
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colony&viewMode=story')
  await page.getByRole('button', { name: 'Edit location' }).click()
  let edit = page.getByRole('dialog', { name: 'Edit location' })
  await edit.getByText('Coordinates and address details').click()
  await edit.getByRole('button', { name: 'Find nearby address' }).click()
  await expect(edit.getByLabel('Saved address or landmark (optional)')).not.toHaveValue('')
  await edit.getByRole('button', { name: 'Save location' }).click()
  await page.getByRole('button', { name: 'Edit location' }).click()
  edit = page.getByRole('dialog', { name: 'Edit location' })
  await edit.getByText('Coordinates and address details').click()
  await edit.getByLabel('Latitude').fill('25.8')
  await expect(edit.getByLabel('Saved address or landmark (optional)')).toHaveValue('')
  await edit.getByRole('button', { name: 'Save location' }).click()
  await expect(page.getByRole('region', { name: 'Location' }).getByText('701 Brickell Avenue, Miami, Florida, United States')).toHaveCount(0)
})

test('a failed nearby lookup keeps the location and allows a manual address', async ({ page }) => {
  await page.route('https://photon.komoot.io/reverse?*', (route) => route.fulfill({ status: 503, body: 'Unavailable' }))
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colony&viewMode=story')
  await page.getByRole('button', { name: 'Edit location' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit location' })
  await edit.getByText('Coordinates and address details').click()
  await edit.getByRole('button', { name: 'Find nearby address' }).click()
  await expect(edit.getByRole('alert')).toContainText('Address lookup unavailable')
  await edit.getByLabel('Saved address or landmark (optional)').fill('Behind the garden')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await edit.getByRole('button', { name: 'Save location' }).click()
  await expect(page.getByRole('region', { name: 'Location' }).getByText('Behind the garden')).toBeVisible()
})

test('a late lookup cannot replace an address entered by hand', async ({ page }) => {
  let release!: () => void
  let started!: () => void
  const waiting = new Promise<void>((resolve) => { release = resolve })
  const requested = new Promise<void>((resolve) => { started = resolve })
  await page.route('https://photon.komoot.io/reverse?*', async (route) => { started(); await waiting; await route.fulfill({ json: nearby }).catch(() => {}) })
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colony&viewMode=story')
  await page.getByRole('button', { name: 'Edit location' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit location' })
  await edit.getByText('Coordinates and address details').click()
  await edit.getByLabel('Saved address or landmark (optional)').fill('Original label')
  await expect(edit.getByRole('button', { name: 'Save location' })).toBeEnabled()
  await edit.getByRole('button', { name: 'Find nearby address' }).click()
  await requested
  await expect(edit.getByRole('button', { name: 'Save location' })).toBeDisabled()
  await edit.getByLabel('Saved address or landmark (optional)').fill('Garden path')
  release()
  await expect(edit.getByLabel('Saved address or landmark (optional)')).toHaveValue('Garden path')
  await edit.getByRole('button', { name: 'Save location' }).click()
  await expect(page.getByRole('region', { name: 'Location' }).getByText('Garden path')).toBeVisible()
})
