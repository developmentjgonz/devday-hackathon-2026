import { expect, test } from '@playwright/test'
import { openWorkspaceNavigation } from './state-helpers'

const story = '/iframe.html?id=pages-colonies-and-cats--cat&viewMode=story'

for (const width of [390, 1440]) {
  test(`manage a cat task and follow its history at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(story)
    await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
    const timeline = page.getByRole('region', { name: 'Timeline' })

    await page.getByRole('button', { name: 'Edit profile' }).click()
    const profile = page.getByRole('dialog', { name: 'Edit cat profile' })
    await profile.getByLabel('Details (optional)').fill('White paws')
    await profile.getByRole('button', { name: 'Save profile' }).click()
    await expect(timeline.getByText('Cat profile updated')).toBeVisible()
    await expect(timeline).toContainText('White paws')

    await page.getByRole('group', { name: 'Record actions' }).getByRole('button', { name: 'New task' }).click()
    const create = page.getByRole('dialog', { name: 'New task' })
    await expect(create.getByText('Cat: Pepper', { exact: true })).toBeVisible()
    await create.getByLabel('What needs to happen?').fill('Check Pepper’s water')
    await create.getByRole('button', { name: 'Create task' }).click()
    const open = page.getByRole('region', { name: 'Open tasks' })
    await expect(open.getByText('Check Pepper’s water', { exact: true })).toBeVisible()
    await expect(timeline.getByText('Task created: Check Pepper’s water')).toBeVisible()

    await open.getByRole('button', { name: 'Edit task: Check Pepper’s water' }).click()
    await page.getByRole('dialog', { name: 'Edit task' }).getByRole('button', { name: 'Save task' }).click()
    await expect(timeline.getByText('Task updated: Check Pepper’s water')).toHaveCount(0)
    await open.getByRole('button', { name: 'Edit task: Check Pepper’s water' }).click()
    const edit = page.getByRole('dialog', { name: 'Edit task' })
    await edit.getByLabel('What needs to happen?').fill('Refill Pepper’s water')
    await edit.getByRole('button', { name: 'Save task' }).click()
    await expect(timeline.getByText('Task updated: Refill Pepper’s water')).toBeVisible()
    await open.getByRole('button', { name: 'Complete task: Refill Pepper’s water' }).click()
    await page.getByRole('dialog', { name: 'Complete this task?' }).getByRole('button', { name: 'Complete task', exact: true }).click()
    const completed = page.getByRole('region', { name: 'Completed tasks' })
    await expect(completed.getByText('Refill Pepper’s water', { exact: true })).toBeVisible()
    await expect(timeline.getByText('Task completed: Refill Pepper’s water')).toBeVisible()
    await completed.getByRole('button', { name: 'Reopen task: Refill Pepper’s water' }).click()
    await expect(open.getByText('Refill Pepper’s water', { exact: true })).toBeVisible()
    await expect(timeline.getByText('Task reopened: Refill Pepper’s water')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    const nav = await openWorkspaceNavigation(page)
    await nav.getByRole('link', { name: 'Colonies', exact: true }).click()
    await page.getByRole('link', { name: 'Riverside', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Timeline' }).getByText('Task reopened: Refill Pepper’s water')).toBeVisible()
  })
}

test('task actions match the assignee and administrator permissions', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-colonies-and-cats--cat-with-shared-tasks&viewMode=story')
  const tasks = page.getByRole('region', { name: 'Open tasks' })
  await expect(tasks.getByRole('button', { name: 'Edit task: Check Pepper’s water' })).toBeVisible()
  await expect(tasks.getByText('Visit Pepper', { exact: true })).toBeVisible()
  await expect(tasks.getByRole('button', { name: 'Edit task: Visit Pepper' })).toHaveCount(0)
  await expect(tasks.getByRole('button', { name: 'Complete task: Visit Pepper' })).toHaveCount(0)

  await page.goto('/iframe.html?id=pages-colonies-and-cats--cat-with-shared-tasks-as-admin&viewMode=story')
  await expect(tasks.getByRole('button', { name: 'Edit task: Visit Pepper' })).toBeVisible()
  await tasks.getByRole('button', { name: 'Complete task: Visit Pepper' }).click()
  await page.getByRole('dialog', { name: 'Complete this task?' }).getByRole('button', { name: 'Complete task', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Completed tasks' }).getByText('Visit Pepper', { exact: true })).toBeVisible()
})

test('a failed timeline offers a retry instead of showing an empty history', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-colonies-and-cats--timeline-failure&viewMode=story')
  const timeline = page.getByRole('region', { name: 'Timeline' })
  await expect(timeline.getByRole('heading', { name: 'Timeline unavailable' })).toBeVisible()
  await timeline.getByRole('button', { name: 'Try again' }).click()
  await expect(timeline.getByRole('heading', { name: 'Timeline unavailable' })).toBeVisible()
})
