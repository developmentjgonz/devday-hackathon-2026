import { expect, test } from '@playwright/test'

const app = process.env.UI_TEST_ROUTING_APP
test.skip(!app, 'Set UI_TEST_ROUTING_APP to a seeded local app to check browser routing.')

test('shared report and task paths survive sign-in, history, and refresh', async ({ page }) => {
  await page.goto(`${app}/app/reports/report-injury`)
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/)
  await page.getByRole('button', { name: 'Sign in as Alex Morgan' }).click()
  await expect(page).toHaveURL(/\/app\/reports\/report-injury$/)
  await expect(page.getByRole('dialog', { name: 'Report', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('dialog', { name: 'Report', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Close report' }).click()
  await expect(page).toHaveURL(/\/app\/reports$/)

  await page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('link', { name: 'My Tasks' }).click()
  await page.getByRole('link', { name: 'View task: Check shelter bedding' }).click()
  await expect(page).toHaveURL(/\/app\/tasks\/visit-task-45$/)
  const task = page.getByRole('dialog', { name: 'Task', exact: true })
  await expect(task).toContainText('Check shelter bedding')
  await task.getByRole('link', { name: 'Open report: Shelter needs a weather check at Grove' }).click()
  await expect(page).toHaveURL(/\/app\/reports\/report-visit-45$/)
  await expect(page.getByRole('dialog', { name: 'Report', exact: true })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/app\/tasks\/visit-task-45$/)
  await expect(task).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/app\/tasks$/)
  await page.goForward()
  await expect(task).toBeVisible()
  await page.reload()
  await expect(page).toHaveURL(/\/app\/tasks\/visit-task-45$/)
  await expect(page.getByRole('main', { name: 'Task' }).getByRole('heading', { name: 'Check shelter bedding' })).toBeVisible()
})

test('unknown report and task paths show a useful result', async ({ page }) => {
  await page.goto(`${app}/sign-in`)
  await page.getByRole('button', { name: 'Sign in as Alex Morgan' }).click()
  await page.goto(`${app}/app/reports/not-a-report`)
  await expect(page.getByRole('heading', { name: 'Report not found' })).toBeVisible()
  await page.goto(`${app}/app/tasks/not-a-task`)
  await expect(page.getByRole('heading', { name: 'Task not found' })).toBeVisible()
})
