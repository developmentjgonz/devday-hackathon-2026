import { expect, test } from '@playwright/test'
import { openWorkspaceNavigation } from './state-helpers'

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
  await expect(page.getByRole('heading', { name: 'Latest feeding report' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Open reports' }).getByRole('link', { name: 'Morning feeding and fresh water' })).toHaveCount(0)

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

test('a colony can add a cat and move it through its profile', async ({ page }) => {
  await page.goto(emptyStory)
  const cats = page.getByRole('region', { name: 'Cats', exact: true })
  const knownCats = page.getByRole('region', { name: 'At a glance' }).getByRole('listitem').filter({ hasText: 'Known cats' })
  await expect(cats.getByText('No cats in this colony')).toBeVisible()

  await cats.getByRole('button', { name: 'Add cat' }).click()
  const add = page.getByRole('dialog', { name: 'Add cat' })
  await expect(add.getByText('Add a cat to Canal.')).toBeVisible()
  await expect(add.getByLabel('Colony', { exact: true })).toHaveCount(0)
  await add.getByLabel('Cat name').fill('Poppy')
  await add.getByLabel('Details (optional)').fill('White paws')
  await add.getByRole('button', { name: 'Add cat', exact: true }).click()
  await expect(knownCats).toHaveText(/Known cats\s*1/)
  await cats.getByRole('link', { name: 'Poppy' }).click()

  await page.getByRole('button', { name: 'Edit profile' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit cat profile' })
  await expect(edit.getByLabel('Details (optional)')).toHaveValue('White paws')
  await edit.getByLabel('Colony', { exact: true }).selectOption('riverside')
  await edit.getByRole('button', { name: 'Save profile' }).click()
  await page.getByRole('region', { name: 'Details' }).getByRole('link', { name: 'Riverside' }).click()
  await expect(page.getByRole('region', { name: 'Cats', exact: true }).getByRole('link', { name: 'Poppy' })).toBeVisible()

  await page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('link', { name: 'Colonies' }).click()
  await page.getByRole('link', { name: 'Canal', exact: true }).click()
  await expect(knownCats).toHaveText(/Known cats\s*0/)
  await expect(cats.getByText('No cats in this colony')).toBeVisible()
})

test('existing cats can be moved into and removed from a colony', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(story)
  const cats = page.getByRole('region', { name: 'Cats', exact: true })
  const count = page.getByRole('region', { name: 'At a glance' }).getByRole('listitem').filter({ hasText: 'Known cats' })
  await cats.getByRole('button', { name: 'Manage cats' }).click()
  const manage = page.getByRole('dialog', { name: 'Manage cats' })
  await expect(manage.locator('[data-slot="drawer-body"]')).toContainText('Canal')
  await expect(manage.getByRole('button', { name: 'Remove Miso from Canal' })).toBeVisible()
  await manage.getByLabel('Cat', { exact: true }).selectOption('pepper')
  await expect(manage.getByText('This will move Pepper from Riverside to Canal.')).toBeVisible()
  await manage.getByRole('button', { name: 'Add existing cat' }).click()
  await expect(manage.getByRole('button', { name: 'Remove Pepper from Canal' })).toBeVisible()
  await manage.getByRole('button', { name: 'Remove Miso from Canal' }).click()
  await expect(manage.getByLabel('Cat', { exact: true })).toContainText('Miso — No colony')
  await manage.getByLabel('Cat', { exact: true }).selectOption('miso')
  await manage.getByRole('button', { name: 'Add existing cat' }).click()
  await manage.getByRole('button', { name: 'Remove Miso from Canal' }).click()
  await manage.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(count).toHaveText(/Known cats\s*1/)
  await expect(cats.getByRole('link', { name: 'Miso' })).toHaveCount(0)
  await expect(cats.getByRole('link', { name: 'Pepper' })).toBeVisible()

  await page.getByRole('region', { name: 'Open reports' }).getByRole('link', { name: 'Orange cat by the Canal entrance' }).click()
  const review = page.getByRole('dialog', { name: 'Report', exact: true })
  await expect(review.getByLabel('Cat (optional)')).toHaveValue('miso')
  await expect(review.getByLabel('Cat (optional)').locator('option:checked')).toHaveText('Miso (not currently in this colony)')
  await review.getByRole('button', { name: 'Save and finish' }).click()
  await expect(review).toBeHidden()

  await (await openWorkspaceNavigation(page)).getByRole('link', { name: 'Cats', exact: true }).click()
  await page.getByRole('region', { name: 'Cat controls' }).getByLabel('Colony', { exact: true }).selectOption('')
  await page.getByRole('link', { name: 'Miso', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Details' }).getByText('No colony')).toBeVisible()
  await page.getByRole('button', { name: 'Edit profile' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit cat profile' })
  await edit.getByLabel('Details (optional)').fill('White paws')
  await edit.getByRole('button', { name: 'Save profile' }).click()
  await expect(page.getByRole('region', { name: 'Details' }).getByText('White paws')).toBeVisible()
  await page.getByRole('button', { name: 'New report' }).click()
  const report = page.getByRole('dialog', { name: 'New report' })
  await expect(report.getByLabel('Cat (optional)')).toHaveValue('miso')
  await report.getByLabel('What happened?').fill('Miso sighting')
  await report.getByLabel('Details', { exact: true }).fill('Miso was seen near the garden.')
  await report.getByRole('button', { name: 'Submit report' }).click()
  const newReview = page.getByRole('dialog', { name: 'Report', exact: true })
  await newReview.getByLabel('Colony (optional)', { exact: true }).selectOption('canal')
  await newReview.getByLabel('Cat (optional)').selectOption('miso')
  await newReview.getByText('Care note (optional)', { exact: true }).click()
  await newReview.getByLabel('Care note').fill('Sighting reviewed.')
  await newReview.getByRole('button', { name: 'Save and finish' }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('a failed colony change keeps the cat in place', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-colonies-and-cats--save-failure&viewMode=story')
  await page.getByRole('link', { name: 'Canal', exact: true }).click()
  await page.getByRole('region', { name: 'Cats', exact: true }).getByRole('button', { name: 'Manage cats' }).click()
  const manage = page.getByRole('dialog', { name: 'Manage cats' })
  const remove = manage.getByRole('button', { name: 'Remove Miso from Canal' })
  await remove.click()
  await expect(manage.getByRole('alert')).toContainText('The directory is unavailable')
  await expect(remove).toBeEnabled()
  await expect(remove).toBeFocused()
  await manage.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Cats', exact: true }).getByRole('link', { name: 'Miso' })).toBeVisible()
})

test('open tasks and the map align on desktop and stack on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(story)
  const tasks = page.getByRole('region', { name: 'Open tasks' })
  const location = page.getByRole('region', { name: 'Location', exact: true })
  const map = location.getByRole('region', { name: 'Canal location', exact: true })
  await map.scrollIntoViewIfNeeded()
  await expect(map.locator('[data-map-status="ready"]')).toBeVisible()
  const taskHeading = (await tasks.getByRole('heading', { name: 'Open tasks' }).boundingBox())!
  const locationHeading = (await location.getByRole('heading', { name: 'Location' }).boundingBox())!
  const taskBox = (await tasks.boundingBox())!
  const locationBox = (await location.boundingBox())!
  expect(Math.abs(taskHeading.y - locationHeading.y)).toBeLessThan(2)
  expect(taskBox.x + taskBox.width).toBeLessThan(locationBox.x)
  await page.setViewportSize({ width: 390, height: 844 })
  const mobileTasks = (await tasks.boundingBox())!
  const mobileLocation = (await location.boundingBox())!
  expect(mobileLocation.y).toBeGreaterThan(mobileTasks.y + mobileTasks.height)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('completed tasks can be expanded and reopened on a colony', async ({ page }) => {
  await page.goto(story)
  const completed = page.getByRole('region', { name: 'Completed tasks' })
  const summary = completed.locator('summary')
  await expect(summary).toContainText('Completed tasks (1)')
  await expect(completed.getByText('Finished visit', { exact: true })).toBeHidden()
  await summary.focus()
  await page.keyboard.press('Enter')
  await expect(completed.getByText('Finished visit', { exact: true })).toBeVisible()
  await completed.getByRole('link', { name: 'View task: Finished visit' }).click()
  const task = page.getByRole('dialog', { name: 'Task', exact: true })
  await task.getByRole('button', { name: 'Reopen task: Finished visit' }).click()
  await task.getByRole('button', { name: 'Close task' }).click()
  await expect(page.getByRole('region', { name: 'Open tasks' }).getByText('Finished visit', { exact: true })).toBeVisible()
  await expect(completed).toHaveCount(0)
})

test('colony reports show open items with urgent items first', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colony-open-reports&viewMode=story')
  const reports = page.getByRole('region', { name: 'Open reports' })
  const rows = reports.getByRole('listitem')
  await expect(rows).toHaveCount(3)
  await expect(rows.first()).toContainText('Three kittens spotted behind the shed')
  await expect(rows.first()).toContainText('Urgent')
  await expect(reports.getByRole('link', { name: 'Orange cat by the Canal entrance' })).toBeVisible()
  await expect(reports.getByRole('link', { name: 'Evening feeding cover needed' })).toBeVisible()
  await expect(reports).toContainText('Waiting for details')
  await expect(reports.getByRole('link', { name: 'Miso seen at the Canal entrance' })).toHaveCount(0)
  await expect(reports.getByRole('link', { name: 'View all colony reports' })).toHaveAttribute('href', '/app/reports?colony=canal')
})
