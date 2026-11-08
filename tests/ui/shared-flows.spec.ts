import { expect, test } from '@playwright/test'
import { expectFocusRing, fill, leavePointer, openStateStory } from './state-helpers'

for (const overlay of [
  { id: 'overlays-dialog--default', trigger: 'View last visit', close: 'Close visit', modal: true },
  { id: 'overlays-drawer--right-panel', trigger: 'Review report', close: 'Close panel', modal: true },
  { id: 'overlays-popover--account-menu', trigger: 'Account options', close: 'Close account menu', modal: false },
]) {
  test(`${overlay.id}: focus, close controls, Escape, and focus return`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`/iframe.html?id=${overlay.id}&viewMode=story`)
    await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
    const trigger = page.getByRole('button', { name: overlay.trigger, exact: true })
    await expect(trigger).toBeVisible()
    const closedBorder = await trigger.evaluate((element) => getComputedStyle(element).borderColor)
    await expectFocusRing(page, trigger)
    await page.keyboard.press('Enter')
    const popup = page.getByRole('dialog')
    await expect(popup).toBeVisible()
    if (overlay.modal) {
      // Focus stays in a modal through repeated Tab and Shift+Tab.
      for (const key of ['Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab']) {
        await page.keyboard.press(key)
        await expect.poll(() => popup.evaluate((element) => element.contains(document.activeElement))).toBe(true)
      }
    } else {
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      // The open trigger has a persistent border beyond its hover fill.
      await leavePointer(page)
      await expect.poll(() => trigger.evaluate((element) => getComputedStyle(element).borderColor)).not.toBe(closedBorder)
    }
    const close = popup.getByRole('button', { name: overlay.close, exact: true })
    await expectFocusRing(page, close)
    await page.keyboard.press('Enter')
    await expect(popup).not.toBeVisible()
    await expect(trigger).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(popup).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(popup).not.toBeVisible()
    await expect(trigger).toBeFocused()
    if (!overlay.modal) {
      // A nonmodal popover lets Tab leave its last control and then dismisses.
      await page.keyboard.press('Enter')
      await expect(popup).toBeVisible()
      await expect(popup.getByRole('button', { name: overlay.close, exact: true })).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(popup).not.toBeVisible()
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    }
  })
}

test('map location selection and zoom controls work without external tiles', async ({ page }, info) => {
  await openStateStory(page, 'offline-map', info.project.name === 'dark')
  const picker = page.getByRole('button', { name: 'Browse areas', exact: true })
  await picker.focus()
  await page.keyboard.press('Enter')
  const first = page.getByRole('button', { name: /North service area/ })
  const other = page.getByRole('button', { name: /Central service area/ })
  await expect(first).toBeVisible()
  await first.click()
  await expect(page.getByRole('region', { name: 'North service area details' })).toContainText('6–10 colonies · high activity')
  await expect(picker).toBeFocused()
  await picker.click()
  await expect(first).toHaveAttribute('aria-pressed', 'true')
  const selectedFill = await fill(first)
  await first.hover()
  expect(await fill(first)).toBe(selectedFill)
  await other.hover()
  expect(await fill(other)).not.toBe(selectedFill)
  await leavePointer(page)
  await expectFocusRing(page, first)
  expect(await fill(first)).toBe(selectedFill)
  await other.click()
  await expect(page.getByRole('region', { name: 'Central service area details' })).toContainText('3–5 colonies · medium activity')
  await picker.click()
  await expect(other).toHaveAttribute('aria-pressed', 'true')
  await expect(first).toHaveAttribute('aria-pressed', 'false')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('status').filter({ hasText: 'Central service area selected.' })).toBeAttached()

  const zoom = page.getByRole('group', { name: 'Map zoom' })
  await expect(zoom).toBeVisible({ timeout: 20_000 })
  const zoomIn = zoom.getByRole('button', { name: 'Zoom in', exact: true })
  const zoomOut = zoom.getByRole('button', { name: 'Zoom out', exact: true })
  await expectFocusRing(page, zoomIn)
  await page.keyboard.press('Enter')
  await expect(zoomOut).toBeEnabled()
  await expectFocusRing(page, zoomOut)
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('region', { name: 'Central service area details' })).toHaveCount(0)
})

test('clicking a public map area opens and dismisses its summary', async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await openStateStory(page, 'offline-map', info.project.name === 'dark')
  await expect(page.locator('[data-map-status="ready"]')).toBeVisible()
  const canvas = page.locator('.maplibregl-canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Map canvas is not visible')
  const point = { x: box.x + box.width / 2 + box.height * 0.13, y: box.y + box.height / 2 - box.height * 0.16 }
  await expect(async () => {
    await page.mouse.move(point.x, point.y)
    await expect(canvas).toHaveCSS('cursor', 'pointer')
  }).toPass({ timeout: 10_000 })
  await page.mouse.click(point.x, point.y)
  await expect(page.getByRole('region', { name: 'North service area details' })).toContainText('6–10 colonies · high activity')
  await page.mouse.click(box.x + box.width * 0.2, box.y + box.height / 2)
  await expect(page.getByRole('region', { name: 'North service area details' })).toHaveCount(0)
})

test('public area details leave map attribution visible on a narrow screen', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('https://tiles.openfreemap.org/styles/positron', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      version: 8,
      sources: { fixture: { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, attribution: 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap' } },
      layers: [{ id: 'fixture', type: 'circle', source: 'fixture' }],
    }),
  }))
  await page.goto('/iframe.html?id=display-colony-map--public-areas&viewMode=story')
  await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
  await expect(page.locator('[data-map-status="ready"]')).toBeVisible()
  await expect(page.locator('.maplibregl-ctrl-attrib')).toBeVisible()
  await page.getByRole('button', { name: 'Browse areas', exact: true }).click()
  await page.getByRole('button', { name: /Central service area/ }).click()
  const details = page.getByRole('region', { name: 'Central service area details' })
  await expect(details).toBeVisible()
  const popupBox = await details.boundingBox()
  const attributionBox = await page.locator('.maplibregl-ctrl-attrib').boundingBox()
  if (!popupBox || !attributionBox) throw new Error('Map details or attribution is not visible')
  const overlaps = popupBox.x < attributionBox.x + attributionBox.width
    && popupBox.x + popupBox.width > attributionBox.x
    && popupBox.y < attributionBox.y + attributionBox.height
    && popupBox.y + popupBox.height > attributionBox.y
  expect(overlaps).toBe(false)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('area summaries remain available when the map background fails', async ({ page }, info) => {
  await page.route('https://tiles.openfreemap.org/styles/positron', (route) => route.abort())
  await page.goto('/iframe.html?id=display-colony-map--public-areas&viewMode=story')
  await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
  await expect(page.getByText('Map background unavailable')).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: 'Browse areas', exact: true }).click()
  await expect(page.getByRole('button', { name: /North service area.*6–10 colonies.*high activity/ })).toBeVisible()
})

for (const story of ['buttons', 'fields', 'selection', 'links', 'offline-map']) {
  test(`${story}: layout fits a 390px screen`, async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openStateStory(page, story, info.project.name === 'dark')
    await expect(page.locator('#storybook-root')).not.toBeEmpty()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('touch changes selected controls without leaving hover on the previous item', async ({ browser }, info) => {
  const context = await browser.newContext({ baseURL: info.project.use.baseURL, hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })
  try {
    const page = await context.newPage()
    await openStateStory(page, 'selection', info.project.name === 'dark')
    for (const group of ['Records', 'Reports']) {
      const section = page.getByRole('region', { name: group, exact: true })
      const first = section.getByRole('button').first()
      const second = section.getByRole('button').nth(1)
      const idleFill = await fill(second)
      const selectedFill = await fill(first)
      await second.tap()
      await expect.poll(() => fill(second)).toBe(selectedFill)
      await expect.poll(() => fill(first)).toBe(idleFill)
      await first.tap()
      await expect.poll(() => fill(second)).toBe(idleFill)
    }
    const tab = page.getByRole('tab', { name: 'Reviewed' })
    await tab.tap()
    await expect(tab).toHaveAttribute('aria-selected', 'true')
    await openStateStory(page, 'fields', info.project.name === 'dark')
    const checkbox = page.getByRole('checkbox', { name: 'Fresh water (default)', exact: true })
    await checkbox.tap()
    await expect(checkbox).toBeChecked()
    await checkbox.tap()
    await expect(checkbox).not.toBeChecked()
  } finally {
    await context.close()
  }
})
