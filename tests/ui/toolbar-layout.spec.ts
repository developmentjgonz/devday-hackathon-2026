import { expect, test, type Locator, type Page } from '@playwright/test'
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
    await expect(page.getByRole('heading', { name: 'Arrange a care check' })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    const before = await Promise.all([position(controls), position(results)])
    await search.fill('kitten')
    await expect(page.getByRole('heading', { name: 'Confirm the kitten count' })).toBeVisible()
    const after = await Promise.all([position(controls), position(results)])
    expect(after[0].height).toBeCloseTo(before[0].height, 0)
    expect(after[1].y).toBeCloseTo(before[1].y, 0)
    await page.getByRole('button', { name: 'Clear filters' }).click()
    await expect(search).toBeFocused()
    expect((await position(results)).y).toBeCloseTo(before[1].y, 0)
  })

  test(`report filters keep the results in place at ${width}px`, async ({ page }, info) => {
    await open(page, 'pages-reports--focused-inbox', width, info.project.name === 'dark')
    const controls = page.getByRole('region', { name: 'Table controls' })
    const results = width < 768 ? page.getByRole('list', { name: 'Reports' }) : page.getByRole('table', { name: 'Reports' })
    const search = page.getByLabel('Search reports')
    await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible()
    await expect(results).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    const before = await Promise.all([position(controls), position(results)])
    await page.getByRole('button', { name: 'Clear filters' }).click()
    await expect(search).toBeFocused()
    let after = await Promise.all([position(controls), position(results)])
    expect(after[0].height).toBeCloseTo(before[0].height, 0)
    expect(after[1].y).toBeCloseTo(before[1].y, 0)
    await page.getByLabel('Filter by status').selectOption('waiting')
    await expect(page.getByRole('button', { name: 'Review Evening feeding cover needed' })).toBeVisible()
    after = await Promise.all([position(controls), position(results)])
    expect(after[0].height).toBeCloseTo(before[0].height, 0)
    expect(after[1].y).toBeCloseTo(before[1].y, 0)
    await page.getByRole('button', { name: 'Clear filters' }).click()
    expect((await position(results)).y).toBeCloseTo(before[1].y, 0)
  })
}
