import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const searches: string[] = []
    const sessions: object[] = []
    Object.defineProperty(window, '__googleSearches', { value: searches })
    Object.defineProperty(window, '__googleSearchSessions', { value: sessions })
    Object.defineProperty(window, 'google', { configurable: true, value: { maps: {
      importLibrary: async () => ({
        AutocompleteSessionToken: class {},
        AutocompleteSuggestion: { fetchAutocompleteSuggestions: async ({ input, sessionToken }: { input: string; sessionToken: object }) => {
          searches.push(input)
          sessions.push(sessionToken)
          if (input === 'unavailable') throw new Error('Unavailable')
          if (input === 'old address') await new Promise<void>((resolve) => { Object.defineProperty(window, '__releaseOldGoogleSearch', { configurable: true, value: resolve }) })
          const prediction = {
            placeId: 'place-id', mainText: { toString: () => input }, secondaryText: { toString: () => 'Miami' }, text: { toString: () => `${input}, Miami` },
            toPlace: () => ({ id: 'place-id', location: { toJSON: () => ({ lat: 25.8, lng: -80.2 }) }, formattedAddress: 'Test address', fetchFields: async () => {
              if (input === 'slow place') await new Promise<void>((resolve) => { Object.defineProperty(window, '__releaseGooglePlace', { configurable: true, value: resolve }) })
            } }),
          }
          return { suggestions: [{ placePrediction: prediction }] }
        } },
      }),
    } } })
  })
  await page.goto('/iframe.html?id=experiments-google-maps--search-in-a-form&viewMode=story')
})

test('suggestions appear while typing and selecting one does not submit the surrounding form', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  const input = page.getByRole('searchbox', { name: 'Search for an address or place' })
  await input.fill('701 Brickell Avenue')
  expect(await page.evaluate(() => (window as Window & { __googleSearches: string[] }).__googleSearches)).toEqual([])
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
  const input = page.getByRole('searchbox', { name: 'Search for an address or place' })
  await input.fill('unavailable')
  await expect(page.getByRole('alert')).toContainText('Address search unavailable')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Saved', { exact: true })).toBeVisible()
})

test('editing the query prevents an older result from replacing a newer one', async ({ page }) => {
  const input = page.getByRole('searchbox', { name: 'Search for an address or place' })
  await input.fill('old address')
  await page.waitForFunction(() => typeof (window as Window & { __releaseOldGoogleSearch?: () => void }).__releaseOldGoogleSearch === 'function')
  await input.fill('new address')
  await expect(page.getByRole('button', { name: /new address/ })).toBeVisible()
  await page.evaluate(() => (window as Window & { __releaseOldGoogleSearch: () => void }).__releaseOldGoogleSearch())
  await expect(page.getByRole('button', { name: /old address/ })).toHaveCount(0)
})

test('suggestions share a session until a place is selected', async ({ page }) => {
  const input = page.getByRole('searchbox', { name: 'Search for an address or place' })
  await input.fill('701 Brickell')
  await expect(page.getByRole('button', { name: /701 Brickell/ })).toBeVisible()
  await input.fill('701 Brickell Avenue')
  await page.getByRole('button', { name: /701 Brickell Avenue/ }).click()
  await expect(input).toHaveValue('Test address')
  await input.fill('Another address')
  await expect(page.getByRole('button', { name: /Another address/ })).toBeVisible()
  expect(await page.evaluate(() => {
    const sessions = (window as Window & { __googleSearchSessions: object[] }).__googleSearchSessions
    return sessions.length === 3 && sessions[0] === sessions[1] && sessions[1] !== sessions[2]
  })).toBe(true)
})

test('a late Google place cannot replace coordinates entered by hand', async ({ page }) => {
  await page.goto('/iframe.html?id=experiments-google-maps--add-cat-with-colony&viewMode=story')
  await page.getByRole('button', { name: 'Add cat', exact: true }).click()
  const cat = page.getByRole('dialog', { name: 'Add cat' })
  await cat.getByLabel('Cat name').fill('Poppy')
  await cat.getByRole('button', { name: 'Add colony', exact: true }).click()
  const colony = page.getByRole('dialog', { name: 'Add colony' })
  await colony.getByLabel('Colony name').fill('Garden')
  await colony.getByRole('button', { name: 'Add location (optional)' }).click()
  await colony.getByRole('searchbox', { name: 'Search for an address or place' }).fill('slow place')
  await colony.getByRole('button', { name: /slow place/ }).click()
  await page.waitForFunction(() => typeof (window as Window & { __releaseGooglePlace?: () => void }).__releaseGooglePlace === 'function')
  await colony.getByText('Coordinates and address details').click()
  await colony.getByLabel('Latitude').fill('25.9')
  await colony.getByLabel('Longitude').fill('-80.3')
  await page.evaluate(() => (window as Window & { __releaseGooglePlace: () => void }).__releaseGooglePlace())
  await expect(colony.getByLabel('Latitude')).toHaveValue('25.9')
  await expect(colony.getByLabel('Longitude')).toHaveValue('-80.3')
  await expect(colony.getByRole('button', { name: 'Add colony', exact: true })).toBeEnabled()
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
  await expect(colony).toBeVisible()
  await colony.getByRole('button', { name: /701 Brickell Avenue/ }).click()
  await colony.getByText('Coordinates and address details').click()
  await expect(colony.getByLabel('Latitude')).toHaveValue('25.8')
  await colony.getByRole('button', { name: 'Add colony', exact: true }).click()
  await expect(cat.getByLabel('Colony', { exact: true }).locator('option:checked')).toHaveText('Garden')
  await cat.getByRole('button', { name: 'Add cat', exact: true }).click()
  await expect(cat).not.toBeVisible()
})
