import { expect, test, type Page } from '@playwright/test'
import { confirmTaskCompletion } from './task-confirmation'

async function open(page: Page, story: string, dark: boolean, width = 390) {
  await page.setViewportSize({ width, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/iframe.html?id=${story}&viewMode=story`)
  await page.evaluate((enabled) => document.documentElement.classList.toggle('dark', enabled), dark)
}

for (const width of [320, 390, 768, 1440]) {
  test(`task list, details, edit, completion and return work at ${width}px`, async ({ page }, info) => {
    await open(page, 'pages-my-tasks--focused-tasks', info.project.name === 'dark', width)
    const list = page.getByRole('main')
    const taskLink = list.getByRole('link', { name: 'View task: Arrange a care check', exact: true })
    await expect(taskLink).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await taskLink.click()
    const task = page.getByRole('dialog', { name: 'Task', exact: true })
    await expect(task).toBeVisible()
    await task.getByRole('button', { name: 'Edit task: Arrange a care check' }).click()
    const edit = page.getByRole('dialog', { name: 'Edit task', exact: true })
    await expect(edit.getByLabel('What needs to happen?', { exact: true })).toHaveValue('Arrange a care check')
    await edit.getByRole('button', { name: 'Cancel', exact: true }).click()
    await task.getByRole('button', { name: 'Mark complete: Arrange a care check' }).click()
    await confirmTaskCompletion(page, 'Checked appetite and refilled the water.')
    await expect(task.getByText('Checked appetite and refilled the water.')).toBeVisible()
    await task.getByRole('button', { name: 'Close task' }).click()
    await expect(taskLink).toHaveCount(0)
    await page.getByLabel('Filter tasks by status').selectOption('completed')
    await taskLink.click()
    await task.getByRole('button', { name: 'Reopen task: Arrange a care check' }).click()
    await task.getByRole('button', { name: 'Close task' }).click()
    await page.getByLabel('Filter tasks by status').selectOption('open')
    await expect(taskLink).toBeVisible()
  })
}

test('a phone list includes tasks beyond the desktop page and restores focus', async ({ page }, info) => {
  await open(page, 'pages-my-tasks--many-tasks', info.project.name === 'dark')
  const tasks = page.getByRole('list', { name: 'My tasks', exact: true })
  await expect(tasks.getByRole('listitem')).toHaveCount(11)
  const last = tasks.getByRole('link', { name: 'View task: Colony care task 11' })
  await last.scrollIntoViewIfNeeded()
  const scroll = await page.evaluate(() => scrollY)
  await last.click()
  await page.getByRole('button', { name: 'Close task' }).click()
  await expect(last).toBeFocused()
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(scroll, 0)
  await expect(page.getByRole('button', { name: 'Next page' })).toBeHidden()
})

for (const variant of ['single-record', 'two-records', 'colonies']) {
  test(`${variant} keeps keyboard focus inside the list corners`, async ({ page }, info) => {
    await open(page, `display-record-list--${variant}`, info.project.name === 'dark', 320)
    const rows = page.getByRole('list', { name: 'Colonies' }).getByRole('link')
    await expect(rows.first()).toBeVisible()
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
    for (const index of [...new Set([0, Math.floor(count / 2), count - 1])]) {
      const row = rows.nth(index)
      await row.focus()
      const shape = await row.evaluate((element) => {
        const style = getComputedStyle(element)
        return { focused: element.matches(':focus-visible'), top: parseFloat(style.borderTopLeftRadius), bottom: parseFloat(style.borderBottomLeftRadius) }
      })
      expect(shape.focused).toBe(true)
      expect(shape.top > 0).toBe(index === 0)
      expect(shape.bottom > 0).toBe(index === count - 1)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('Show more keeps existing rows and moves keyboard focus to the first added row', async ({ page }, info) => {
  await open(page, 'display-record-list--colonies', info.project.name === 'dark')
  const list = page.getByRole('list', { name: 'Colonies' })
  await expect(list.getByRole('listitem')).toHaveCount(20)
  await page.getByRole('button', { name: 'Show more' }).click()
  await expect(list.getByRole('listitem')).toHaveCount(40)
  await expect(list.getByRole('link').nth(20)).toBeFocused()
  await expect(list.getByRole('link').first()).toContainText('Colony 01')
  await page.getByRole('button', { name: 'Show more' }).click()
  await expect(list.getByRole('listitem')).toHaveCount(45)
  await expect(list.getByRole('link').nth(40)).toBeFocused()
  await expect(page.getByRole('button', { name: 'Show more' })).toHaveCount(0)
})

test('report sorting and search apply to the full phone feed and detail panels return focus', async ({ page }, info) => {
  await open(page, 'pages-reports--busy-inbox', info.project.name === 'dark')
  const list = page.getByRole('list', { name: 'Reports', exact: true })
  await page.getByLabel('Sort reports').selectOption('title-asc')
  const trigger = list.getByRole('button').first()
  const title = await trigger.getAttribute('aria-label')
  await trigger.click()
  await expect(page.getByRole('dialog', { name: 'Report', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Close report' }).click()
  await expect(trigger).toBeFocused()
  await expect(trigger).toHaveAttribute('aria-label', title!)
  await page.getByRole('searchbox', { name: 'Search reports' }).fill('no such report')
  await expect(page.getByRole('heading', { name: 'No matching reports' })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search reports' }).fill('')
  await expect(list).toBeVisible()
})

for (const [story, label] of [
  ['pages-colonies-and-cats--colonies', 'Colonies'],
  ['pages-colonies-and-cats--cats', 'Cats'],
  ['pages-team--team', 'Team accounts'],
] as const) {
  test(`${label} uses a compact phone list without horizontal overflow`, async ({ page }, info) => {
    await open(page, story, info.project.name === 'dark', 320)
    const list = page.getByRole('list', { name: label, exact: true })
    await expect(list).toBeVisible()
    const row = list.locator('[data-slot="record-list-item"]').first()
    await expect(row).toBeVisible()
    expect(await row.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThan(160)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const name = await row.getAttribute('aria-label')
    await row.focus()
    await page.keyboard.press('Enter')
    if (label === 'Team accounts') await expect(page.getByRole('dialog')).toBeVisible()
    else await expect(page.getByRole('heading', { name: name!, level: 1, exact: true })).toBeVisible()
  })
}

for (const story of ['pages-my-tasks--long-content', 'pages-colonies-and-cats--long-names-and-no-reports', 'pages-team--long-content']) {
  test(`${story} wraps long content on a narrow phone`, async ({ page }, info) => {
    await open(page, story, info.project.name === 'dark', 320)
    await expect(page.locator('[data-slot="record-list-item"]').first()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test.describe('touch controls', () => {
  test.use({ hasTouch: true, isMobile: true })
  test('search, filters and actions retain phone-sized targets', async ({ page }, info) => {
    await open(page, 'pages-my-tasks--focused-tasks', info.project.name === 'dark')
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
    for (const control of [page.getByLabel('Search my tasks'), page.getByLabel('Filter tasks by status'), page.getByRole('button', { name: 'New task' })]) {
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    }
    expect(await page.getByLabel('Search my tasks').evaluate((input) => parseFloat(getComputedStyle(input).fontSize))).toBeGreaterThanOrEqual(16)
    await page.getByRole('link', { name: 'View task: Arrange a care check' }).tap()
    const task = page.getByRole('dialog', { name: 'Task', exact: true })
    const complete = task.getByRole('button', { name: 'Mark complete: Arrange a care check' })
    await expect(complete).toBeVisible()
    expect((await complete.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await task.getByRole('button', { name: 'Close task' }).tap()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
})
