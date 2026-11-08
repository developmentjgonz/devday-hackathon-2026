import { expect, test } from '@playwright/test'
import { expectFocusRing, fill, leavePointer, openWorkspaceNavigation } from './state-helpers'

const story = '/iframe.html?id=pages-colonies-and-cats--colonies&viewMode=story'

test('view switcher, search, and add action have matching heights', async ({ page }) => {
  await page.goto(story)
  const controls = page.getByRole('region', { name: 'Colony controls' })
  const switcher = controls.getByRole('group', { name: 'Colony view' })
  const search = controls.getByRole('searchbox', { name: 'Search colonies' })
  const add = controls.getByRole('button', { name: 'Add colony' })
  const heights = await Promise.all([switcher, search, add].map(async (control) => (await control.boundingBox())?.height))
  expect(heights[0]).toBe(heights[1])
  expect(heights[1]).toBe(heights[2])
})

test('record cards show hover and keyboard focus across the whole link', async ({ page }) => {
  await page.goto(story)
  const colony = page.getByRole('link', { name: 'Canal', exact: true })
  const idle = await fill(colony)
  await colony.hover()
  await expect.poll(() => fill(colony)).not.toBe(idle)
  await leavePointer(page)
  await expectFocusRing(page, colony)
})

for (const width of [390, 1440]) {
  test(`browse colonies and cats at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(story)
    await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
    await expect(page.getByRole('heading', { name: 'Colonies', level: 1 })).toBeVisible()

    await page.getByLabel('Search colonies').fill('Canal')
    await expect(page.getByRole('link', { name: 'Canal', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Riverside', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Cards', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Cards', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('link', { name: 'Canal', exact: true })).toBeVisible()
    await page.getByRole('link', { name: 'Canal', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Canal', level: 1 })).toBeVisible()
    await page.getByRole('link', { name: 'Miso', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Miso', level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Canal', exact: true })).toBeVisible()

    const nav = await openWorkspaceNavigation(page)
    await nav.getByRole('link', { name: 'Cats', exact: true }).click()
    await page.getByLabel('Colony', { exact: true }).selectOption('riverside')
    await expect(page.getByRole('link', { name: 'Pepper', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Miso', exact: true })).toHaveCount(0)
    await page.getByLabel('Search cats').fill('not found')
    await expect(page.getByText('No matching cats')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('a reviewed report and its task appear in the related colony', async ({ page }, info) => {
  await page.goto(story)
  await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
  await page.getByRole('link', { name: 'Riverside', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Possible injury near the feeding station', exact: true })).toHaveCount(1)
  await page.getByRole('region', { name: 'Urgent reports to review' }).getByRole('link', { name: 'Possible injury near the feeding station', exact: true }).click()
  await page.getByRole('button', { name: 'Create task', exact: true }).click()
  await page.getByLabel('What needs to happen?', { exact: true }).fill('Check Pepper at the fence')
  await page.getByLabel('Assign to', { exact: true }).selectOption({ label: 'Maya Rivera' })
  await page.getByRole('dialog', { name: 'Create a care task' }).getByRole('button', { name: 'Create task' }).click()
  await page.getByRole('button', { name: 'Save and finish' }).click()

  const nav = page.getByRole('navigation', { name: 'Workspace navigation' })
  await nav.getByRole('link', { name: 'Colonies', exact: true }).click()
  await page.getByRole('link', { name: 'Riverside', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Check Pepper at the fence' })).toBeVisible()
  await page.getByRole('link', { name: 'View colony reports' }).click()
  await expect(page.getByRole('combobox', { name: 'Filter by colony' })).toHaveValue('riverside')
  await expect(page.getByRole('combobox', { name: 'Filter by status' })).toHaveValue('all')

  await nav.getByRole('link', { name: 'My Tasks', exact: true }).click()
  await page.getByRole('button', { name: 'Complete task: Check Pepper at the fence' }).click()
  await page.getByRole('dialog', { name: 'Complete this task?', exact: true }).getByRole('button', { name: 'Complete task', exact: true }).click()
  await nav.getByRole('link', { name: 'Colonies', exact: true }).click()
  await page.getByRole('link', { name: 'Riverside', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Check Pepper at the fence' })).toHaveCount(0)
})

test('a report started from a cat profile includes its colony and cat', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-colonies-and-cats--cat&viewMode=story')
  await page.getByRole('group', { name: 'Record actions' }).getByRole('button', { name: 'New report' }).click()
  const composer = page.getByRole('dialog', { name: 'New report' })
  await expect(composer.getByLabel('Colony', { exact: true })).toHaveValue('riverside')
  await expect(composer.getByLabel('Cat (optional)', { exact: true })).toHaveValue('pepper')
  await composer.getByLabel('Colony', { exact: true }).selectOption('canal')
  await expect(composer.getByLabel('Cat (optional)', { exact: true })).toHaveValue('')
  await composer.getByLabel('Colony', { exact: true }).selectOption('riverside')
  await composer.getByLabel('Cat (optional)', { exact: true }).selectOption('pepper')
  await composer.getByLabel('What happened?').fill('Pepper was seen eating')
  await composer.getByLabel('Details', { exact: true }).fill('Pepper came to the feeding station.')
  await composer.getByRole('button', { name: 'Submit report' }).click()
  const review = page.getByRole('dialog', { name: 'Pepper was seen eating' })
  await expect(review).toBeVisible()
  await expect(review.getByLabel('Colony', { exact: true })).toHaveValue('riverside')
  await expect(review.getByLabel('Cat (optional)', { exact: true })).toHaveValue('pepper')
})

test('cat photos show when available and fall back when unavailable', async ({ page }) => {
  const photo = '**/photo-1514888286974-6c03e2ca1dba**'
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZYAAAAASUVORK5CYII=', 'base64')
  await page.route(photo, (route) => route.fulfill({ status: 200, contentType: 'image/png', body: pixel }))
  await page.goto('/iframe.html?id=pages-colonies-and-cats--cats&viewMode=story')
  await expect(page.getByRole('img', { name: 'Pepper photo' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Miso, no photo' })).toBeVisible()
  await page.unroute(photo)
  await page.route(photo, (route) => route.abort())
  await page.reload()
  await expect(page.getByRole('img', { name: 'Pepper, no photo' })).toBeVisible()
})
