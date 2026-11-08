import { expect, test } from '@playwright/test'

for (const width of [320, 390, 1440]) {
  test(`report fields scroll while the title and save controls stay fixed at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 720 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/iframe.html?id=pages-reports--long-report-drawer&viewMode=story')
    await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
    const report = page.getByRole('dialog', { name: 'Report', exact: true })
    const header = report.locator('[data-slot="drawer-header"]')
    const footer = report.locator('[data-slot="drawer-footer"]')
    const body = report.locator('[data-slot="drawer-body"]')
    const colony = body.getByLabel('Colony', { exact: true })
    await expect(header.getByRole('combobox')).toHaveCount(0)
    await expect(header).not.toContainText('Colony')
    await expect(report.getByRole('region', { name: 'Original report' })).toBeInViewport()
    const fixed = { header: await header.boundingBox(), footer: await footer.boundingBox() }
    await colony.scrollIntoViewIfNeeded()
    await colony.selectOption('canal')
    await body.getByLabel('Cat (optional)').selectOption('miso')
    const fieldTop = (await colony.boundingBox())!.y
    await body.evaluate((element) => { element.scrollTop = 0 })
    expect((await colony.boundingBox())!.y).toBeGreaterThan(fieldTop)
    expect(await header.boundingBox()).toEqual(fixed.header)
    expect(await footer.boundingBox()).toEqual(fixed.footer)
    await expect(colony).toHaveValue('canal')
    await expect(body.getByLabel('Cat (optional)')).toHaveValue('miso')
    await expect(footer.getByRole('button', { name: 'Save and finish' })).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('the original report comes before AI suggestions and report subflows keep context in the body', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/iframe.html?id=pages-reports--ai-suggestions&viewMode=story')
  const report = page.getByRole('dialog', { name: 'Report', exact: true })
  const original = report.getByRole('region', { name: 'Original report' })
  await expect(original).toBeVisible()
  expect(await original.evaluate((element) => Boolean(element.compareDocumentPosition(document.getElementById('report-suggestions-summary')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true)
  const headerHeight = (await report.locator('[data-slot="drawer-header"]').boundingBox())!.height
  await report.getByRole('button', { name: 'Create task', exact: true }).click()
  const task = page.getByRole('dialog', { name: 'Create a care task' })
  expect((await task.locator('[data-slot="drawer-header"]').boundingBox())!.height).toBeCloseTo(headerHeight, 0)
  await expect(task.locator('[data-slot="drawer-header"] [data-slot="drawer-context"]')).toHaveCount(0)
  await expect(task.locator('[data-slot="drawer-body"] [data-slot="drawer-context"]')).toContainText('Riverside')
})

test('new report fields are part of the scrolling form and keep their selected values', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/iframe.html?id=pages-reports--focused-inbox&viewMode=story')
  await page.getByRole('button', { name: 'New report', exact: true }).click()
  const form = page.getByRole('dialog', { name: 'New report' })
  const header = form.locator('[data-slot="drawer-header"]')
  const body = form.locator('[data-slot="drawer-body"]')
  await expect(header.getByRole('combobox')).toHaveCount(0)
  await body.getByLabel('Colony', { exact: true }).selectOption('canal')
  await body.getByLabel('Cat (optional)').selectOption('miso')
  await body.getByLabel('What happened?').fill('Water bowls checked')
  await body.getByLabel('Details', { exact: true }).fill('Both bowls have clean water.')
  await body.evaluate((element) => { element.scrollTop = element.scrollHeight })
  await expect(body.getByLabel('Colony', { exact: true })).toHaveValue('canal')
  await expect(body.getByLabel('Cat (optional)')).toHaveValue('miso')
  await expect(form.getByRole('button', { name: 'Submit report' })).toBeInViewport()
})
