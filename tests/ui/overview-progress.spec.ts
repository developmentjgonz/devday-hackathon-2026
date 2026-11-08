import { expect, test, type Page } from '@playwright/test'

async function openOverview(page: Page, dark: boolean, story = 'progress-overview') {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/iframe.html?id=pages-my-tasks--${story}&viewMode=story`)
  await page.evaluate((enabled) => document.documentElement.classList.toggle('dark', enabled), dark)
  await expect(page.getByRole('heading', { level: 1, name: 'Overview', exact: true })).toBeVisible()
}

test('overview separates personal, team, and report progress and updates after confirmed completion', async ({ page }, info) => {
  await openOverview(page, info.project.name === 'dark')
  const mine = page.getByRole('progressbar', { name: 'My task completion', exact: true })
  const team = page.getByRole('progressbar', { name: 'Team task completion', exact: true })
  const reports = page.getByRole('progressbar', { name: 'Report review completion', exact: true })
  await expect(mine).toHaveAttribute('aria-valuenow', '1')
  await expect(mine).toHaveAttribute('aria-valuemax', '4')
  await expect(team).toHaveAttribute('aria-valuenow', '1')
  await expect(team).toHaveAttribute('aria-valuemax', '5')
  await expect(reports).toHaveAttribute('aria-valuenow', '2')
  await expect(reports).toHaveAttribute('aria-valuemax', '7')
  await expect(page.getByRole('list', { name: 'Tasks', exact: true })).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Team summary', exact: true })).toHaveCount(1)
  await page.getByRole('link', { name: 'View my tasks', exact: true }).click()
  await page.getByRole('button', { name: 'Complete task: Arrange a care check', exact: true }).click()
  await page.getByRole('dialog', { name: 'Complete this task?', exact: true }).getByRole('button', { name: 'Complete task', exact: true }).click()
  await page.getByRole('navigation', { name: 'Workspace navigation', exact: true }).getByRole('link', { name: 'Overview', exact: true }).click()
  await expect(mine).toHaveAttribute('aria-valuenow', '2')
  await expect(team).toHaveAttribute('aria-valuenow', '2')
  await expect(reports).toHaveAttribute('aria-valuenow', '2')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(mine).toHaveAttribute('aria-valuenow', '1')
  await expect(team).toHaveAttribute('aria-valuenow', '1')
  await page.getByRole('link', { name: 'View my tasks', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'My Tasks', exact: true })).toBeVisible()
})

test('empty task progress has a clear zero-total state', async ({ page }, info) => {
  await openOverview(page, info.project.name === 'dark', 'no-tasks-overview')
  await expect(page.getByRole('progressbar', { name: 'My task completion', exact: true })).toHaveAttribute('aria-valuetext', 'No items')
  await expect(page.getByRole('progressbar', { name: 'Team task completion', exact: true })).toHaveAttribute('aria-valuetext', 'No items')
  await expect(page.getByText('No tasks assigned', { exact: true })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Tasks', exact: true })).toHaveCount(0)
})

for (const width of [320, 390, 768, 1440]) {
  test(`overview progress cards fit ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1080 })
    await openOverview(page, info.project.name === 'dark')
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(page.getByRole('progressbar')).toHaveCount(3)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (width === 1440 && info.project.name === 'light') await page.screenshot({ path: 'test-results/overview-polish/after.png', fullPage: true })
  })
}
