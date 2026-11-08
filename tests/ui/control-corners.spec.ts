import { expect, test, type Locator } from '@playwright/test'

async function cornerMetrics(control: Locator) {
  return control.evaluate((element) => {
    const surface = element.closest('[role="dialog"]')!
    const outer = surface.getBoundingClientRect()
    const inner = element.getBoundingClientRect()
    const surfaceStyle = getComputedStyle(surface)
    const controlStyle = getComputedStyle(element)
    return {
      outerRadius: parseFloat(surfaceStyle.borderTopRightRadius),
      innerRadius: parseFloat(controlStyle.borderTopRightRadius),
      top: inner.top - outer.top,
      bottom: outer.bottom - inner.bottom,
      left: inner.left - outer.left,
      right: outer.right - inner.right,
    }
  })
}

test('buttons and form controls share the radius scale', async ({ page }, info) => {
  await page.goto('/iframe.html?id=foundations-interaction-states--control-corners&viewMode=story')
  await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
  const controls = page.locator('[data-slot="button"], [data-slot="input"], [data-slot="select-field"], [data-slot="textarea"]')
  await expect(controls).toHaveCount(4)
  const radii = () => controls.evaluateAll((elements) => elements.map((element) => parseFloat(getComputedStyle(element).borderRadius)))
  const initial = await radii()
  expect(new Set(initial).size).toBe(1)

  await page.evaluate(() => document.documentElement.style.setProperty('--radius', '20px'))
  const scaled = await radii()
  expect(new Set(scaled).size).toBe(1)
  expect(scaled[0]).toBeGreaterThan(initial[0])
})

test('popover actions follow both lower corners of the surface', async ({ page }, info) => {
  await page.goto('/iframe.html?id=overlays-popover--account-menu&viewMode=story')
  await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
  await page.getByRole('button', { name: 'Account options', exact: true }).click()
  const close = page.getByRole('dialog').getByRole('button', { name: 'Close account menu', exact: true })
  await expect(close).toBeVisible()

  for (const radius of ['16px', '20px']) {
    await page.evaluate((value) => document.documentElement.style.setProperty('--radius', value), radius)
    const metrics = await cornerMetrics(close)
    expect(metrics.left).toBeCloseTo(metrics.bottom, 1)
    expect(metrics.right).toBeCloseTo(metrics.bottom, 1)
    expect(metrics.innerRadius + metrics.bottom).toBeCloseTo(metrics.outerRadius, 1)
  }
})

test('dialog close button follows the top corner of the surface', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/iframe.html?id=overlays-dialog--default&viewMode=story')
  await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
  await page.getByRole('button', { name: 'View last visit', exact: true }).click()
  const close = page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true })
  await expect(close).toBeVisible()

  for (const radius of ['16px', '20px']) {
    await page.evaluate((value) => document.documentElement.style.setProperty('--radius', value), radius)
    await expect.poll(async () => {
      const metrics = await cornerMetrics(close)
      return Math.max(Math.abs(metrics.top - metrics.right), Math.abs(metrics.innerRadius + metrics.top - metrics.outerRadius))
    }).toBeLessThan(0.1)
  }
})

test('map zoom controls meet without inner gaps and follow the frame', async ({ page }, info) => {
  await page.goto('/iframe.html?id=foundations-interaction-states--offline-map&viewMode=story')
  await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
  const group = page.getByRole('group', { name: 'Map zoom' })
  await expect(group).toBeVisible({ timeout: 20_000 })
  const zoomIn = group.getByRole('button', { name: 'Zoom in' })
  const zoomOut = group.getByRole('button', { name: 'Zoom out' })
  await zoomIn.hover()
  const geometry = await group.evaluate((element) => {
    const [first, second] = [...element.querySelectorAll('button')]
    const frame = getComputedStyle(element)
    const upper = first.getBoundingClientRect()
    const lower = second.getBoundingClientRect()
    return {
      frameRadius: parseFloat(frame.borderRadius),
      overflow: frame.overflow,
      upperRadius: parseFloat(getComputedStyle(first).borderRadius),
      lowerRadius: parseFloat(getComputedStyle(second).borderRadius),
      gap: lower.top - upper.bottom,
    }
  })
  expect(geometry.frameRadius).toBeGreaterThan(0)
  expect(geometry.overflow).toBe('hidden')
  expect(geometry.upperRadius).toBe(0)
  expect(geometry.lowerRadius).toBe(0)
  expect(geometry.gap).toBeCloseTo(0, 1)
  await zoomIn.click()
  await expect(zoomOut).toBeEnabled()
})
