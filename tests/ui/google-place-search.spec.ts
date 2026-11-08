import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const searches: string[] = []
    Object.defineProperty(window, '__googleSearches', { value: searches })
    Object.defineProperty(window, 'google', { configurable: true, value: { maps: {
      importLibrary: async () => ({
        AutocompleteSessionToken: class {},
        AutocompleteSuggestion: { fetchAutocompleteSuggestions: async ({ input }: { input: string }) => {
          searches.push(input)
          if (input === 'unavailable') throw new Error('Unavailable')
          if (input === 'old address') await new Promise<void>((resolve) => { Object.defineProperty(window, '__releaseOldGoogleSearch', { configurable: true, value: resolve }) })
          const prediction = {
            placeId: 'place-id', mainText: { toString: () => input }, secondaryText: { toString: () => 'Miami' }, text: { toString: () => `${input}, Miami` },
            toPlace: () => ({ id: 'place-id', location: { toJSON: () => ({ lat: 25.8, lng: -80.2 }) }, formattedAddress: 'Test address', fetchFields: async () => {} }),
          }
          return { suggestions: [{ placePrediction: prediction }] }
        } },
      }),
    } } })
  })
  await page.goto('/iframe.html?id=experiments-google-maps--search-in-a-form&viewMode=story')
})

test('search runs only on submit and Enter does not submit the surrounding form', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  const input = page.getByRole('searchbox', { name: 'Search for an address or place' })
  await input.fill('701 Brickell Avenue')
  expect(await page.evaluate(() => (window as Window & { __googleSearches: string[] }).__googleSearches)).toEqual([])
  await input.press('Enter')
  await expect(page.getByRole('button', { name: /701 Brickell Avenue/ })).toBeVisible()
  expect(await page.evaluate(() => (window as Window & { __googleSearches: string[] }).__googleSearches)).toEqual(['701 Brickell Avenue'])
  await expect(page.getByText('Saved', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: /701 Brickell Avenue/ }).click()
  await expect(page.getByText('Place selected')).toBeVisible()
  await expect(page.getByText('Saved', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Saved', { exact: true })).toBeVisible()
})

test('an unavailable search leaves the form usable', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search for an address or place' }).fill('unavailable')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Address search unavailable')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Saved', { exact: true })).toBeVisible()
})

test('editing the query prevents an older result from replacing a newer one', async ({ page }) => {
  const input = page.getByRole('searchbox', { name: 'Search for an address or place' })
  await input.fill('old address')
  await input.press('Enter')
  await page.waitForFunction(() => typeof (window as Window & { __releaseOldGoogleSearch?: () => void }).__releaseOldGoogleSearch === 'function')
  await input.fill('new address')
  await input.press('Enter')
  await expect(page.getByRole('button', { name: /new address/ })).toBeVisible()
  await page.evaluate(() => (window as Window & { __releaseOldGoogleSearch: () => void }).__releaseOldGoogleSearch())
  await expect(page.getByRole('button', { name: /old address/ })).toHaveCount(0)
})

test('a colony can be searched and added while creating a cat', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto('/iframe.html?id=experiments-google-maps--add-cat-with-colony&viewMode=story')
  await page.getByRole('button', { name: 'Add cat', exact: true }).click()
  const cat = page.getByRole('dialog', { name: 'Add cat' })
  await cat.getByLabel('Cat name').fill('Poppy')
  await cat.getByRole('button', { name: 'Add colony', exact: true }).click()
  const colony = page.getByRole('dialog', { name: 'Add colony' })
  await colony.getByLabel('Colony name').fill('Garden')
  await colony.getByRole('button', { name: 'Add location (optional)' }).click()
  await colony.getByRole('searchbox', { name: 'Search for an address or place' }).fill('701 Brickell Avenue')
  await colony.getByRole('searchbox', { name: 'Search for an address or place' }).press('Enter')
  await expect(colony).toBeVisible()
  await colony.getByRole('button', { name: /701 Brickell Avenue/ }).click()
  await expect(colony.getByLabel('Latitude')).toHaveValue('25.8')
  await colony.getByRole('button', { name: 'Add colony', exact: true }).click()
  await expect(cat.getByLabel('Colony', { exact: true }).locator('option:checked')).toHaveText('Garden')
  await cat.getByRole('button', { name: 'Add cat', exact: true }).click()
  await expect(cat).not.toBeVisible()
})
