import { expect, test } from '@playwright/test'
import { appearance, expectFocusRing, fill, leavePointer, openStateStory } from './state-helpers'

test('notification icon has hover feedback, keyboard focus, and an accessible count', async ({ page }, info) => {
  await page.goto('/iframe.html?id=actions-notification-button--with-notifications&viewMode=story')
  await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
  const button = page.getByRole('button', { name: 'Notifications: 3', exact: true })
  await expect(button).toBeVisible()
  const idle = await appearance(button)
  await button.hover()
  await expect.poll(() => appearance(button)).not.toEqual(idle)
  await leavePointer(page)
  await expectFocusRing(page, button)
})

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
  const first = page.getByRole('button', { name: /North service area/ })
  const other = page.getByRole('button', { name: /Central service area/ })
  await expect(first).toBeVisible()
  await first.click()
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
  await expect(other).toHaveAttribute('aria-pressed', 'true')
  await expect(first).toHaveAttribute('aria-pressed', 'false')
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
    const tab = page.getByRole('tab', { name: 'Processed' })
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
