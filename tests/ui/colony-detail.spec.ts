import { expect, test } from '@playwright/test'

const story = '/iframe.html?id=pages-colonies-and-cats--colony-at-a-glance&viewMode=story'
const emptyStory = '/iframe.html?id=pages-colonies-and-cats--colony-without-location&viewMode=story'

test.beforeEach(async ({ page }) => {
  await page.route('**/images.unsplash.com/**', (route) => route.abort())
  await page.route('https://tiles.openfreemap.org/styles/positron', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ version: 8, sources: {}, layers: [] }),
  }))
})

test('colony counts include open cat tasks and update when a task is added', async ({ page }) => {
  await page.goto(story)
  await expect(page.getByRole('heading', { name: 'Canal', level: 2 })).toBeVisible({ timeout: 20_000 })
  const glance = page.getByRole('region', { name: 'At a glance' })
  const item = (label: string) => glance.getByRole('listitem').filter({ hasText: label })
  await expect(item('Urgent reports')).toHaveText(/Urgent reports\s*1/)
  await expect(item('Open reports')).toHaveText(/Open reports\s*2/)
  await expect(item('Open tasks')).toHaveText(/Open tasks\s*2/)
  await expect(item('Known cats')).toHaveText(/Known cats\s*1/)
  await expect(page.getByRole('region', { name: 'Open tasks' }).getByText('Check on Miso')).toBeVisible()

  await page.getByRole('button', { name: 'New task' }).click()
  const dialog = page.getByRole('dialog', { name: 'New task' })
  await dialog.getByLabel('What needs to happen?').fill('Bring fresh water')
  await dialog.getByRole('button', { name: 'Create task' }).click()
  await expect(item('Open tasks')).toHaveText(/Open tasks\s*3/)
  await expect(page.getByRole('region', { name: 'Open tasks' }).getByText('Bring fresh water')).toBeVisible()
})

test('a colony without records or a location stays readable on a narrow screen', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto(emptyStory)
  await expect(page.getByRole('heading', { name: 'Canal', level: 2 })).toBeVisible({ timeout: 20_000 })
  await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
  const glance = page.getByRole('region', { name: 'At a glance' })
  await expect(glance.getByRole('listitem')).toHaveText([
    /Urgent reports\s*0/, /Open reports\s*0/, /Open tasks\s*0/, /Known cats\s*0/,
  ])
  const location = page.getByRole('region', { name: 'Location' })
  await expect(location.getByText('No location set')).toBeVisible()
  await expect(location.getByRole('button', { name: 'Set location' })).toBeVisible()
  await expect(page.getByText('No cats in this colony')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
