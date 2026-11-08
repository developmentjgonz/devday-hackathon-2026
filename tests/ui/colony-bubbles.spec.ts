import { expect, test } from '@playwright/test'

test('colony bubbles show every assigned cat and link to its record', async ({ page }, info) => {
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colony-bubbles-small&viewMode=story')
  await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
  const chart = page.getByRole('region', { name: 'Colony bubbles' })
  const garden = chart.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Garden', exact: true }) })
  await expect(garden.getByRole('link', { name: /^Open cat:/ })).toHaveCount(8)
  await expect(chart.getByRole('heading', { name: 'No cats yet' })).toBeVisible()
  await expect(chart.getByRole('link', { name: /^Open cat:/ })).toHaveCount(11)
  await expect(page.getByRole('region', { name: 'Cats without a colony' }).getByRole('link', { name: 'Open cat: Blue' })).toBeVisible()
  await garden.getByRole('link', { name: 'Open cat: Luna, Garden' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Luna' })).toBeVisible()
})

test('cat bubbles reveal details on hover and keyboard focus', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colony-bubbles-small&viewMode=story')
  const cat = page.getByRole('link', { name: 'Open cat: Luna, Garden' })
  await cat.hover()
  const tip = page.getByRole('tooltip')
  await expect(tip).toContainText('Luna')
  await expect(tip).toContainText('Garden')
  await expect(tip).toContainText('About')
  await expect(tip).toContainText('Orange tabby with a white chest.')
  await page.mouse.move(0, 0)
  await expect(tip).toHaveCount(0)
  await cat.focus()
  await expect(page.getByRole('tooltip')).toContainText('Luna')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('tooltip')).toHaveCount(0)
})

test('the full community contains 25 colonies and 200 cat bubbles', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colony-bubbles-many-cats&viewMode=story')
  const chart = page.getByRole('region', { name: 'Colony bubbles' })
  await expect(chart.getByRole('listitem')).toHaveCount(25)
  await expect(chart.getByRole('link', { name: /^Open cat:/ })).toHaveCount(200)
  await expect(page.getByLabel('Community totals')).toContainText('25')
  await expect(page.getByLabel('Community totals')).toContainText('200')
  const generatedPhoto = chart.locator('img[src^="/fixtures/generated-community-cats.svg"]').first()
  await expect(generatedPhoto).toBeVisible()
  await expect.poll(() => generatedPhoto.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
})

test('zoom controls fit the community and resize its cat bubbles', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colony-bubbles-many-cats&viewMode=story')
  const bubble = page.getByRole('region', { name: 'Colony bubbles' }).getByRole('link', { name: /^Open cat:/ }).first()
  const initial = (await bubble.boundingBox())!.width
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect.poll(async () => (await bubble.boundingBox())!.width).toBeGreaterThan(initial)
  await page.getByRole('button', { name: 'Zoom out' }).click()
  await page.getByRole('button', { name: 'Fit all' }).click()
  await expect.poll(async () => Math.round((await bubble.boundingBox())!.width)).toBe(Math.round(initial))
})

test('wheel zoom keeps the layout together and the background can be dragged', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colony-bubbles-many-cats&viewMode=story')
  const chart = page.getByRole('region', { name: 'Colony bubbles' })
  const first = chart.getByRole('link', { name: /^Open cat:/ }).nth(0)
  const second = chart.getByRole('link', { name: /^Open cat:/ }).nth(20)
  const beforeFirst = (await first.boundingBox())!
  const beforeSecond = (await second.boundingBox())!
  const bounds = (await chart.boundingBox())!
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await page.mouse.wheel(0, -700)
  await expect.poll(async () => (await first.boundingBox())!.width).toBeGreaterThan(beforeFirst.width * 2)
  await expect.poll(() => chart.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
  const afterFirst = (await first.boundingBox())!
  const afterSecond = (await second.boundingBox())!
  expect((afterSecond.x - afterFirst.x) / afterFirst.width).toBeCloseTo((beforeSecond.x - beforeFirst.x) / beforeFirst.width, 1)
  const zoomAnchorX = bounds.x + bounds.width / 2
  expect(Math.abs(afterFirst.x - (zoomAnchorX + (beforeFirst.x - zoomAnchorX) * afterFirst.width / beforeFirst.width))).toBeLessThan(3)
  const scrollBefore = await chart.evaluate((element) => element.scrollLeft)
  expect(scrollBefore).toBeGreaterThan(0)
  await page.mouse.move(bounds.x + 5, bounds.y + 5)
  await page.mouse.down()
  await page.mouse.move(bounds.x + 105, bounds.y + 5, { steps: 5 })
  await page.mouse.up()
  expect(await chart.evaluate((element) => element.scrollLeft)).toBeLessThan(scrollBefore)
  await page.getByRole('button', { name: 'Fit all' }).click()
  await expect.poll(async () => Math.round((await first.boundingBox())!.width)).toBe(Math.round(beforeFirst.width))
  await expect(chart.locator('.mews-bubble-drift').first()).toHaveCSS('animation-name', 'none')
})

test('the map view shows the same colonies', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colony-bubbles-many-cats&viewMode=story')
  await page.getByRole('group', { name: 'Colony view' }).getByRole('button', { name: 'Map' }).click()
  await expect(page.getByRole('heading', { name: 'Colony map' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Browse colonies' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Find colony' }).click()
  await page.getByRole('button', { name: /Allapattah/ }).click()
  const details = page.getByRole('dialog', { name: 'Allapattah' })
  await expect(details.getByRole('heading', { name: 'Cats', exact: true })).toBeVisible()
  await details.getByRole('button', { name: 'Close colony details' }).click()
  await page.getByRole('group', { name: 'Colony view' }).getByRole('button', { name: 'Bubbles' }).click()
  await expect(page.getByRole('region', { name: 'Colony bubbles' }).getByRole('link', { name: /^Open cat:/ })).toHaveCount(200)
})

test('selecting a marker opens its colony details', async ({ page }) => {
  await page.route('https://tiles.openfreemap.org/styles/positron', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ version: 8, sources: {}, layers: [] }),
  }))
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colony-bubbles-one-colony&viewMode=story')
  await page.getByRole('group', { name: 'Colony view' }).getByRole('button', { name: 'Map' }).click()
  const canvas = page.locator('[data-map-status="ready"] canvas')
  await expect(canvas).toBeVisible()
  const details = page.getByRole('dialog', { name: 'Riverside' })
  await expect.poll(async () => { await canvas.click(); return details.isVisible() }, { timeout: 10_000 }).toBe(true)
  await expect(details.getByRole('heading', { name: 'At a glance' })).toBeVisible()
  await expect(details.getByRole('heading', { name: 'Cats', exact: true })).toBeVisible()
  await details.getByRole('button', { name: 'Close colony details' }).click()
  await expect(details).toHaveCount(0)
})

test('the colony picker also opens colonies without a location', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colony-bubbles-small&viewMode=story')
  await page.getByRole('group', { name: 'Colony view' }).getByRole('button', { name: 'Map' }).click()
  await page.getByRole('button', { name: 'Find colony' }).click()
  await page.getByRole('button', { name: /Orchard.*No location/ }).click()
  const details = page.getByRole('dialog', { name: 'Orchard' })
  await expect(details.getByRole('heading', { name: 'At a glance' })).toBeVisible()
  await expect(details.getByText('No location set')).toBeVisible()
})

test('an empty directory explains how to find colonies', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colony-bubbles-empty&viewMode=story')
  await expect(page.getByRole('heading', { name: 'No colonies yet' })).toBeVisible()
  await page.getByRole('link', { name: 'View colonies' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Colonies' })).toBeVisible()
})

test('the colony directory opens the bubble page', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colonies&viewMode=story')
  await page.getByRole('link', { name: 'Colony bubbles' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Colony bubbles' })).toBeVisible()
})

test('large colonies keep every cat reachable on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colony-bubbles-large&viewMode=story')
  const chart = page.getByRole('region', { name: 'Colony bubbles' })
  await expect(chart.getByRole('link', { name: /^Open cat:/ })).toHaveCount(50)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(await chart.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)
  const lastCat = chart.getByRole('link', { name: 'Open cat: Cat 50, A large colony' })
  await lastCat.scrollIntoViewIfNeeded()
  await expect(lastCat).toBeInViewport()
})
