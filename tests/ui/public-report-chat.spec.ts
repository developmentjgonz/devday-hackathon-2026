import { expect, test } from '@playwright/test'

const story = '/iframe.html?id=pages-public-report--chat&viewMode=story'
const enabled = { phone: null, email: null, chatAvailable: true }
test.beforeEach(async ({ page }, info) => {
  await page.addInitScript((dark) => {
    window.addEventListener('DOMContentLoaded', () => document.documentElement.classList.toggle('dark', dark), { once: true })
  }, info.project.name === 'dark')
})
const address = { type: 'FeatureCollection', features: [
  { type: 'Feature', properties: { name: '701 Brickell Avenue', city: 'Miami', state: 'Florida', country: 'United States' }, geometry: { type: 'Point', coordinates: [-80.189696, 25.767088] } },
  { type: 'Feature', properties: { name: 'Brickell City Centre', city: 'Miami', state: 'Florida', country: 'United States' }, geometry: { type: 'Point', coordinates: [-80.192912, 25.767392] } },
  { type: 'Feature', properties: { name: 'Brickell Park', city: 'Miami', state: 'Florida', country: 'United States' }, geometry: { type: 'Point', coordinates: [-80.191, 25.77] } },
] }
const locations = address.features.map(({ properties, geometry }) => ({
  title: properties.name, description: 'Miami, Florida, United States',
  label: `${properties.name}, Miami, Florida, United States`,
  longitude: geometry.coordinates[0], latitude: geometry.coordinates[1],
}))

test('the empty composer stays at the bottom on desktop and phone', async ({ page }) => {
  await page.route('**/api/public-reports/contact', (route) => route.fulfill({ json: enabled }))
  await page.goto(story)
  await expect(page.getByText(/If you’re still where you saw them, share your current location below/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Use my current location' })).toBeVisible()
  for (const size of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size)
    const input = page.getByLabel('Your message')
    await expect(input).toBeVisible()
    const form = input.locator('xpath=ancestor::form')
    const box = (await form.boundingBox())!
    expect(size.height - box.y - box.height).toBeLessThan(35)
    await expect(page.getByRole('button', { name: 'Add photos or attachments' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

test('photos survive assistant failure, form fallback, and a failed send', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/api/public-reports/contact', (route) => route.fulfill({ json: enabled }))
  await page.route('**/api/public-reports/chat', (route) => route.fulfill({ status: 503, json: { error: 'Mews cannot reply right now.' } }))
  const submissions: Array<{ key: string; body: string }> = []
  await page.route('**/api/public-reports', (route) => {
    expect(route.request().headers()['content-type']).toContain('multipart/form-data')
    submissions.push({ key: route.request().headers()['idempotency-key'], body: route.request().postDataBuffer()!.toString() })
    return route.fulfill(submissions.length === 1 ? { status: 503, json: { error: 'Could not send your report. Try again.' } } : { status: 201, json: { submitted: true } })
  })
  await page.goto(story)
  const photo = { name: 'cat.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aA1cAAAAASUVORK5CYII=', 'base64') }
  await page.getByLabel('Photos and attachments', { exact: true }).setInputFiles([photo, { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Near the library') }])
  await expect(page.getByRole('img', { name: 'cat.png', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Remove notes.txt', exact: true }).click()
  await page.getByLabel('Your message').fill('Three cats were limping near Oak Street.')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText('Mews cannot reply right now.')).toBeVisible()
  await page.getByRole('button', { name: 'Use the report form instead' }).click()
  await expect(page.getByRole('img', { name: 'cat.png', exact: true })).toBeVisible()
  await expect(page.getByLabel('What did you notice?')).toHaveValue('Three cats were limping near Oak Street.')
  await page.getByLabel('Where did you see the cat?').fill('Oak Street')
  await page.getByRole('button', { name: 'Send report', exact: true }).click()
  await expect(page.getByText('Could not send your report. Try again.')).toBeVisible()
  await expect(page.getByRole('img', { name: 'cat.png', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Send report', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Thank you for helping cats.' })).toBeVisible()
  expect(submissions).toHaveLength(2)
  expect(submissions[0].key).toBe(submissions[1].key)
  for (const { body } of submissions) {
    expect(body).toContain('filename="cat.png"')
    expect(body).not.toContain('filename="notes.txt"')
    expect(body).toContain('Three cats were limping near Oak Street.')
  }
  await page.getByRole('button', { name: 'Send another report' }).click()
  await expect(page.getByRole('button', { name: 'Remove cat.png' })).toHaveCount(0)
})

test('chat keeps the caring reply and sends attachments only after review', async ({ page }) => {
  await page.route('**/api/public-reports/contact', (route) => route.fulfill({ json: enabled }))
  const reply = 'Thank you for looking out for them. I can send this to the care team. Please check the details below.'
  await page.route('**/api/public-reports/chat', (route) => route.fulfill({ json: { ready: true, reply, location: 'Oak Street', details: 'Three cats were limping.', urgent: false, locations: [] } }))
  let sent = 0
  await page.route('**/api/public-reports', (route) => {
    sent++
    expect(route.request().headers()['content-type']).toContain('multipart/form-data')
    expect(route.request().postDataBuffer()!.toString()).toContain('filename="notes.txt"')
    return route.fulfill({ status: 201, json: { submitted: true } })
  })
  await page.goto(story)
  await page.getByLabel('Photos and attachments', { exact: true }).setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Near the library') })
  await page.getByLabel('Your message').fill('Three cats were limping on Oak Street.')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText(reply, { exact: true })).toBeVisible()
  await expect(page.getByText('1 attachment will be sent with your report.', { exact: true })).toBeVisible()
  expect(sent).toBe(0)
  await page.getByLabel('Your message').fill('They were near the library.')
  await expect(page.getByRole('button', { name: 'Yes, send report' })).toBeDisabled()
  await page.getByLabel('Your message').fill('')
  await page.getByRole('button', { name: 'Yes, send report' }).click()
  await expect(page.getByText('Your report has been sent to the care team for review.', { exact: false })).toBeVisible()
  expect(sent).toBe(1)
})

test('chat finds an address and files the confirmed report in the conversation', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.route('**/api/public-reports/contact', (route) => route.fulfill({ json: enabled }))
  let browserSearches = 0
  await page.route('https://photon.komoot.io/**', (route) => { browserSearches++; return route.abort() })
  let turns = 0
  await page.route('**/api/public-reports/chat', async (route) => {
    const request = route.request().postDataJSON()
    turns++
    if (turns === 1) {
      expect(request.messages).toEqual([{ role: 'user', text: 'I saw a limping cat near 701 Brickell in Miami.' }])
      await route.fulfill({ json: { ready: false, reply: 'Which of these places is where you saw the cat?', location: '', details: '', urgent: false, locations, locationSource: 'search' } })
    } else {
      expect(request.messages.at(-1).text).toBe('The cats were here: 701 Brickell Avenue, Miami, Florida, United States')
      expect(request.selectedLocation).toEqual({ label: locations[0].label, latitude: 25.767088, longitude: -80.189696 })
      await route.fulfill({ json: { ready: true, reply: 'Thanks.', location: locations[0].label, details: 'A cat was limping.', urgent: false, locations: [], mapLocation: { type: 'pin', latitude: 25.767088, longitude: -80.189696 } } })
    }
  })
  let submitted: unknown
  await page.route('**/api/public-reports', async (route) => {
    submitted = route.request().postDataJSON()
    await route.fulfill({ status: 201, json: { submitted: true } })
  })
  await page.goto(story)
  await expect(page.getByRole('heading', { name: 'Chat with Mews' })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Find an address' })).toHaveCount(0)
  await expect(page.getByText(/Messages are sent to OpenAI/)).toHaveCount(0)
  await expect(page.getByLabel('Search for an address or place')).toHaveCount(0)
  const message = page.getByLabel('Your message')
  await message.focus()
  await expect(message).toBeFocused()
  const focusStyles = await message.evaluate((element) => ({ input: getComputedStyle(element).boxShadow, container: getComputedStyle(element.closest('form')!).boxShadow }))
  expect(focusStyles.input).not.toMatch(/0px 0px 0px [1-9]/)
  expect(focusStyles.container).toMatch(/0px 0px 0px 1px/)
  await message.fill('I saw a limping cat near 701 Brickell in Miami.')
  await message.press('Enter')
  await expect(page.getByText('Which of these places is where you saw the cat?')).toBeVisible()
  const results = page.getByRole('list', { name: 'Suggested locations' })
  await expect(results).toBeVisible()
  await expect.poll(async () => results.evaluate((list) => {
    const bounds = list.getBoundingClientRect()
    const conversation = list.closest('[aria-label="Conversation"]')!.getBoundingClientRect()
    return bounds.top >= conversation.top && bounds.bottom <= conversation.bottom
  })).toBe(true)
  await results.getByRole('button', { name: /701 Brickell Avenue/ }).click()
  await expect(page.getByRole('heading', { name: 'Your report', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your report', exact: true }).locator('..')).toContainText('701 Brickell Avenue')
  await expect(page.getByRole('heading', { name: 'Your report', exact: true }).locator('..')).toContainText('A cat was limping.')
  await expect(page.getByRole('button', { name: 'Review report' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Yes, send report' }).click()
  await expect(page.getByText('Your report has been sent to the care team for review.', { exact: false })).toBeVisible()
  expect(submitted).toEqual({ location: locations[0].label, details: 'A cat was limping.', urgent: false, mapLocation: { type: 'pin', latitude: 25.767088, longitude: -80.189696 } })
  expect(browserSearches).toBe(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const receipt = page.getByRole('heading', { name: 'Your report', exact: true }).locator('xpath=ancestor::*[@data-slot="card"]')
  await expect(receipt.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
  await expect(receipt.getByRole('button', { name: 'Start another report' })).toBeInViewport()
  await expect(page.getByRole('button', { name: 'Use the report form instead' })).toHaveCount(0)
  await expect(message).toHaveCount(0)
  await receipt.getByRole('button', { name: 'Start another report' }).click()
  await expect(message).toBeVisible()
  await expect(message).toHaveValue('')
  await expect(page.getByRole('heading', { name: 'Your report', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Use the report form instead' })).toBeVisible()
})

test('corrections are read back and a failed submission can be retried safely', async ({ page }) => {
  await page.route('**/api/public-reports/contact', (route) => route.fulfill({ json: enabled }))
  let turns = 0
  await page.route('**/api/public-reports/chat', (route) => {
    turns++
    return route.fulfill({ json: { ready: true, reply: 'Thanks.', location: 'Oak Street', details: turns === 1 ? 'A cat was limping.' : 'A cat was limping by the store.', urgent: false, locations: [] } })
  })
  const keys: string[] = []
  const bodies: unknown[] = []
  await page.route('**/api/public-reports', (route) => {
    keys.push(route.request().headers()['idempotency-key'])
    bodies.push(route.request().postDataJSON())
    return route.fulfill(keys.length === 1 ? { status: 503, json: { error: 'Could not send your report. Try again.' } } : { status: 201, json: { submitted: true } })
  })
  await page.goto(story)
  await page.getByLabel('Your message').fill('A cat is limping on Oak Street.')
  await page.getByRole('button', { name: 'Send message' }).click()
  await page.getByRole('button', { name: 'Change details' }).click()
  await page.getByLabel('Your message').fill('The cat is by the store.')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByRole('heading', { name: 'Your report', exact: true }).locator('..').last()).toContainText('by the store')
  await page.getByRole('button', { name: 'Yes, send report' }).click()
  await expect(page.getByText('Could not send your report. Try again.')).toBeVisible()
  await page.getByRole('button', { name: 'Yes, send report' }).click()
  await expect(page.getByText('Your report has been sent to the care team for review.', { exact: false })).toBeVisible()
  expect(keys[0]).toBeTruthy()
  expect(keys[0]).toBe(keys[1])
  expect(bodies[0]).toEqual(bodies[1])
})

test('a visitor can ask to look up an address during the conversation', async ({ page }) => {
  await page.route('**/api/public-reports/contact', (route) => route.fulfill({ json: enabled }))
  let turns = 0
  await page.route('**/api/public-reports/chat', (route) => {
    turns++
    return route.fulfill({ json: { ready: turns === 1, reply: turns === 1 ? 'Thanks.' : 'What city is Oak Street in, and is there a nearby landmark?', location: turns === 1 ? 'Oak Street' : '', details: 'A cat was limping.', urgent: false, locations: [] } })
  })
  await page.goto(story)
  await page.getByLabel('Your message').fill('A cat is limping on Oak Street.')
  await page.getByRole('button', { name: 'Send message' }).click()
  await page.getByLabel('Your message').fill('Can I look up the location?')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText('What city is Oak Street in, and is there a nearby landmark?')).toBeVisible()
  await expect(page.getByLabel('Search for an address or place')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Your report' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Nothing else' })).toHaveCount(0)
})

test('a failed assistant reply preserves the message when switching to the report form', async ({ page }) => {
  await page.route('**/api/public-reports/contact', (route) => route.fulfill({ json: enabled }))
  await page.route('**/api/public-reports/chat', (route) => route.fulfill({ status: 503, json: { error: 'The assistant is unavailable. Try again or use the report form.' } }))
  await page.goto(story)
  await page.getByLabel('Your message').fill('A cat was seen at Oak Street.')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText('The assistant is unavailable. Try again or use the report form.')).toBeVisible()
  await page.getByRole('button', { name: 'Use the report form instead' }).click()
  await expect(page.getByLabel('What did you notice?')).toHaveValue('A cat was seen at Oak Street.')
  await expect(page.getByLabel('Where did you see the cat?')).toBeVisible()
})

test('the standard form can send a map pin without a typed address', async ({ page }) => {
  await page.route('**/api/public-reports/contact', (route) => route.fulfill({ json: enabled }))
  await page.route('https://tiles.openfreemap.org/**', (route) => route.fulfill({ json: { version: 8, sources: {}, layers: [] } }))
  let submitted: unknown
  await page.route('**/api/public-reports', (route) => { submitted = route.request().postDataJSON(); return route.fulfill({ status: 201, json: { submitted: true } }) })
  await page.goto('/iframe.html?id=pages-public-report--form&viewMode=story')
  await page.getByText('Add a map location (optional)', { exact: true }).click()
  await page.getByText('Coordinates and address details', { exact: true }).click()
  await page.getByLabel('Latitude', { exact: true }).fill('25.767088')
  await page.getByLabel('Longitude', { exact: true }).fill('-80.189696')
  await page.getByLabel('What did you notice?').fill('A cat was resting by the door.')
  await page.getByRole('button', { name: 'Send report' }).click()
  await expect(page.getByRole('heading', { name: 'Thank you for helping cats.' })).toBeVisible()
  expect(submitted).toEqual({ location: '', details: 'A cat was resting by the door.', urgent: false, mapLocation: { type: 'pin', latitude: 25.767088, longitude: -80.189696 } })
})

test('current location in chat is confirmed before it becomes the report pin and survives form fallback', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 25.767088, longitude: -80.189696, accuracy: 25 })
  await page.route('**/api/public-reports/contact', (route) => route.fulfill({ json: enabled }))
  let turns = 0
  let submissions = 0
  const location = { label: 'Current location near Brickell Avenue, Miami', title: 'Your current location', description: 'Near Brickell Avenue, Miami. Approximate accuracy: 25 m.', latitude: 25.767088, longitude: -80.189696 }
  await page.route('**/api/public-reports/chat', (route) => {
    turns++
    const input = route.request().postDataJSON()
    if (turns === 1) {
      expect(input.currentLocation).toEqual({ latitude: 25.767088, longitude: -80.189696, accuracy: 25 })
      expect(input.messages[0].text).toBe('A cat is limping here.')
      return route.fulfill({ json: { ready: false, reply: 'Is this where you saw the cats?', location: '', details: '', urgent: false, locations: [location], locationSource: 'device' } })
    }
    expect(input.currentLocation).toBeUndefined()
    expect(input.selectedLocation).toEqual({ label: location.label, latitude: location.latitude, longitude: location.longitude })
    return route.fulfill({ json: { ready: true, reply: 'Please check the details.', location: location.label, details: 'A cat is limping.', urgent: false, locations: [], mapLocation: { type: 'pin', latitude: location.latitude, longitude: location.longitude } } })
  })
  await page.route('**/api/public-reports', (route) => {
    submissions++
    expect(route.request().postDataJSON().mapLocation).toEqual({ type: 'pin', latitude: location.latitude, longitude: location.longitude })
    return route.fulfill({ status: 201, json: { submitted: true } })
  })
  await page.goto(story)
  await page.getByLabel('Your message').fill('A cat is limping here.')
  await page.getByRole('button', { name: 'Use my current location' }).click()
  await expect(page.getByText('Is this where you saw the cats?', { exact: true })).toBeVisible()
  expect(turns).toBe(1)
  expect(submissions).toBe(0)
  await expect(page.getByRole('heading', { name: 'Your report' })).toHaveCount(0)
  await page.getByRole('button', { name: `Use location: ${location.label}`, exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your report' })).toBeVisible()
  expect(submissions).toBe(0)
  await page.getByRole('button', { name: 'Use the report form instead' }).click()
  await expect(page.getByLabel('Where did you see the cat?')).toHaveValue(location.label)
  await page.getByRole('button', { name: 'Send report', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Thank you for helping cats.' })).toBeVisible()
  expect(submissions).toBe(1)
})

test('the standard form can use current location without opening the map', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 25.767088, longitude: -80.189696, accuracy: 25 })
  await page.route('**/api/public-reports/contact', (route) => route.fulfill({ json: enabled }))
  let submitted: unknown
  await page.route('**/api/public-reports', (route) => { submitted = route.request().postDataJSON(); return route.fulfill({ status: 201, json: { submitted: true } }) })
  await page.goto('/iframe.html?id=pages-public-report--form&viewMode=story')
  await page.getByRole('button', { name: 'Use my current location' }).click()
  await expect(page.getByLabel('Where did you see the cat?')).toHaveValue('Current location')
  await expect(page.getByText(/Current location added.*25 m/)).toBeVisible()
  await expect(page.getByLabel('Search for an address or place')).toHaveCount(0)
  await page.getByLabel('What did you notice?').fill('A gray cat by the door.')
  await page.getByRole('button', { name: 'Send report', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Thank you for helping cats.' })).toBeVisible()
  expect(submitted).toEqual({ location: 'Current location', details: 'A gray cat by the door.', urgent: false, mapLocation: { type: 'pin', latitude: 25.767088, longitude: -80.189696 } })
})

test('denied location access keeps chat and form text available', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
    getCurrentPosition: (_success: unknown, failure: (error: { code: number }) => void) => failure({ code: 1 }),
  } }))
  await page.route('**/api/public-reports/contact', (route) => route.fulfill({ json: enabled }))
  let calls = 0
  await page.route('**/api/public-reports/chat', (route) => { calls++; return route.abort() })
  await page.goto(story)
  await page.getByLabel('Your message').fill('A cat was near the library.')
  await page.getByRole('button', { name: 'Use my current location' }).click()
  await expect(page.getByText(/Location access was not allowed/)).toBeVisible()
  await expect(page.getByLabel('Your message')).toHaveValue('A cat was near the library.')
  expect(calls).toBe(0)
  await page.getByRole('button', { name: 'Use the report form instead' }).click()
  await page.getByLabel('Where did you see the cat?').fill('Miami library')
  await page.getByRole('button', { name: 'Use my current location' }).click()
  await expect(page.getByText(/Location access was not allowed/)).toBeVisible()
  await expect(page.getByLabel('Where did you see the cat?')).toHaveValue('Miami library')
  await expect(page.getByLabel('What did you notice?')).toHaveValue('A cat was near the library.')
})

test('a slow chat reply keeps focus and does not close the composer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/api/public-reports/contact', (route) => route.fulfill({ json: enabled }))
  let release!: () => void
  const pending = new Promise<void>((resolve) => { release = resolve })
  let requests = 0
  await page.route('**/api/public-reports/chat', async (route) => {
    requests++
    await pending
    await route.fulfill({ json: { ready: false, reply: 'Where did you see the cat?', location: '', details: 'A limping cat.', urgent: false, locations: [] } })
  })
  await page.goto(story)
  const input = page.getByLabel('Your message')
  await input.fill('I saw a limping cat.')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(input).toBeFocused()
  await expect(input).toHaveAttribute('readonly', '')
  await expect(input).toBeEnabled()
  const pendingBox = await input.boundingBox()
  await input.press('Enter')
  expect(requests).toBe(1)
  release()
  await expect(page.getByText('Where did you see the cat?', { exact: true })).toBeVisible()
  await expect(input).toBeFocused()
  await expect(input).not.toHaveAttribute('readonly')
  const readyBox = await input.boundingBox()
  expect(Math.abs(readyBox!.y - pendingBox!.y)).toBeLessThan(2)
})

test('a slow form submission keeps its size and shows success in the same card', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/api/public-reports/contact', (route) => route.fulfill({ json: enabled }))
  let release!: () => void
  const pending = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/public-reports', async (route) => { await pending; await route.fulfill({ status: 201, json: { submitted: true } }) })
  await page.goto('/iframe.html?id=pages-public-report--form&viewMode=story')
  await page.getByLabel('Where did you see the cat?').fill('Oak Street')
  await page.getByLabel('What did you notice?').fill('A gray cat was resting by the door.')
  const card = page.locator('[data-slot="card"]').filter({ has: page.getByLabel('What did you notice?') })
  const before = (await card.boundingBox())!.height
  const send = page.getByRole('button', { name: 'Send report' })
  await send.click()
  await expect(send).toHaveAttribute('aria-busy', 'true')
  await expect(page.getByLabel('What did you notice?')).toHaveValue('A gray cat was resting by the door.')
  expect(Math.abs((await card.boundingBox())!.height - before)).toBeLessThan(2)
  release()
  const success = page.getByRole('heading', { name: 'Thank you for helping cats.' })
  await expect(success).toBeFocused()
  const after = (await success.locator('xpath=ancestor::*[@data-slot="card"]').boundingBox())!.height
  expect(Math.abs(after - before)).toBeLessThan(2)
  await page.getByRole('button', { name: 'Send another report' }).click()
  await expect(page.getByLabel('What did you notice?')).toHaveValue('')
})

test('a failed form submission keeps the send button in place and preserves the report for retry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/api/public-reports/contact', (route) => route.fulfill({ json: enabled }))
  const requests: Array<{ key: string; body: unknown }> = []
  await page.route('**/api/public-reports', (route) => {
    requests.push({ key: route.request().headers()['idempotency-key'], body: route.request().postDataJSON() })
    return route.fulfill(requests.length === 1 ? { status: 503, json: { error: 'Could not send your report. Try again.' } } : { status: 201, json: { submitted: true } })
  })
  await page.goto('/iframe.html?id=pages-public-report--form&viewMode=story')
  await page.getByLabel('Where did you see the cat?').fill('Oak Street')
  await page.getByLabel('What did you notice?').fill('A gray cat was resting by the door.')
  const send = page.getByRole('button', { name: 'Send report' })
  const documentY = () => send.evaluate((button) => button.getBoundingClientRect().top + scrollY)
  const before = await documentY()
  await send.click()
  await expect(page.getByText('Could not send your report. Try again.')).toBeVisible()
  expect(Math.abs(await documentY() - before)).toBeLessThan(2)
  await expect(page.getByLabel('What did you notice?')).toHaveValue('A gray cat was resting by the door.')
  await send.click()
  await expect(page.getByRole('heading', { name: 'Thank you for helping cats.' })).toBeVisible()
  expect(requests[1]).toEqual(requests[0])
})
