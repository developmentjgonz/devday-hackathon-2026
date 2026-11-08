import { expect, test, type Locator, type Page } from '@playwright/test'
import { openReportFilters } from './report-filters'
test.setTimeout(60000)

async function open(page: Page, story: string, width: number, dark: boolean) {
  await page.setViewportSize({ width, height: 1000 })
  await page.goto(`/iframe.html?id=${story}&viewMode=story`)
  await page.evaluate((enabled) => document.documentElement.classList.toggle('dark', enabled), dark)
}

async function position(locator: Locator) {
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  return box!
}

for (const width of [320, 360, 390, 480, 640, 768, 1024, 1440]) {
  test(`task search keeps controls and results in place at ${width}px`, async ({ page }, info) => {
    await open(page, 'pages-my-tasks--focused-tasks', width, info.project.name === 'dark')
    const controls = page.getByRole('region', { name: 'Task controls' })
    const results = page.getByRole('region', { name: 'My tasks', exact: true })
    const search = page.getByLabel('Search my tasks')
    await expect(search).toBeVisible()
    await expect(page.getByRole('link', { name: 'View task: Arrange a care check' })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    const before = await Promise.all([position(controls), position(results)])
    await search.fill('kitten')
    await expect(page.getByRole('link', { name: 'View task: Confirm the kitten count' })).toBeVisible()
    const after = await Promise.all([position(controls), position(results)])
    expect(after[0].height).toBeCloseTo(before[0].height, 0)
    expect(after[1].y).toBeCloseTo(before[1].y, 0)
    await search.clear()
    await expect(search).toBeFocused()
    expect((await position(results)).y).toBeCloseTo(before[1].y, 0)
  })

  test(`report filters stay usable at ${width}px`, async ({ page }, info) => {
    await open(page, 'pages-reports--focused-inbox', width, info.project.name === 'dark')
    const controls = page.getByRole('region', { name: 'Report controls' })
    const results = width < 768 ? page.getByRole('list', { name: 'Reports' }) : page.getByRole('table', { name: 'Reports' })
    const trigger = page.getByRole('button', { name: /^Filters/ })
    await expect(results).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    const before = await Promise.all([position(controls), position(results)])
    await openReportFilters(page)
    const after = await Promise.all([position(controls), position(results)])
    expect(after[0].height).toBeCloseTo(before[0].height, 0)
    expect(after[1].y).toBeCloseTo(before[1].y, 0)
    await page.getByRole('dialog', { name: 'Filters' }).getByRole('button', { name: 'Clear filters' }).click()
    await expect(trigger).toBeFocused()
    expect((await position(controls)).height).toBeCloseTo(before[0].height, 0)
    expect((await position(results)).y).toBeCloseTo(before[1].y, 0)
    await openReportFilters(page)
    await page.getByLabel('Filter by status').selectOption('waiting')
    await expect(page.getByRole('button', { name: 'Review Evening feeding cover needed' })).toBeVisible()
    await expect(controls).toContainText('Status: Waiting for details')
    await page.keyboard.press('Escape')
    expect((await position(controls)).height).toBeCloseTo(before[0].height, 0)
    expect((await position(results)).y).toBeCloseTo(before[1].y, 0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

for (const width of [320, 768, 1440]) {
  test(`report sorting keeps toolbar controls in place at ${width}px`, async ({ page }, info) => {
    await open(page, 'pages-reports--focused-inbox', width, info.project.name === 'dark')
    await page.evaluate(() => document.fonts.ready)
    const sort = page.getByRole('combobox', { name: 'Sort reports' })
    const add = page.getByRole('button', { name: 'New report' })
    const results = width < 768 ? page.getByRole('list', { name: 'Reports' }) : page.getByRole('table', { name: 'Reports' }).locator('tbody')
    await expect(sort).toHaveValue('received-desc')
    await expect(results.locator(width < 768 ? ':scope > li' : ':scope > tr').first()).toContainText('Cat seen near a parking lot')
    const before = await Promise.all([position(sort), position(add)])
    for (const [value, title] of [['title-asc', 'Cat seen near a parking lot'], ['received-asc', 'Morning feeding and fresh water'], ['priority', 'Three kittens spotted behind the shed'], ['received-desc', 'Cat seen near a parking lot']]) {
      await sort.selectOption(value!)
      await expect(results.locator(width < 768 ? ':scope > li' : ':scope > tr').first()).toContainText(title!)
      const after = await Promise.all([position(sort), position(add)])
      for (let index = 0; index < before.length; index++) {
        expect(after[index]!.x).toBeCloseTo(before[index]!.x, 0)
        expect(after[index]!.y).toBeCloseTo(before[index]!.y, 0)
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('report filters focus the popup for pointer use and the first field for keyboard use', async ({ page }) => {
  await open(page, 'pages-reports--focused-inbox', 1440, false)
  const trigger = page.getByRole('button', { name: /^Filters/ })
  const popup = page.getByRole('dialog', { name: 'Filters' })
  const status = popup.getByRole('combobox', { name: 'Filter by status' })
  await trigger.click()
  await expect(popup).toBeFocused()
  await expect(status).not.toBeFocused()
  await page.keyboard.press('Tab')
  await expect(status).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await trigger.press('Enter')
  await expect(status).toBeFocused()
  expect(await status.evaluate((element) => element.matches(':focus-visible'))).toBe(true)
})
