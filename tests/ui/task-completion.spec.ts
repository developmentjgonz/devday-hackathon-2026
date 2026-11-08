import { expect, test } from '@playwright/test'
import { confirmTaskCompletion } from './task-confirmation'

test('a completion note remains available on the task after it is reopened', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-my-tasks--focused-tasks&viewMode=story')
  await page.getByRole('button', { name: 'Mark complete: Arrange a care check' }).click()
  await confirmTaskCompletion(page, 'Refilled both water bowls.')
  await page.getByLabel('Filter tasks by status').selectOption('completed')
  await page.getByRole('link', { name: 'View task: Arrange a care check' }).click()
  const task = page.getByRole('dialog', { name: 'Task', exact: true })
  await expect(task.getByText('Completion note', { exact: true })).toBeVisible()
  await expect(task.getByText('Refilled both water bowls.')).toBeVisible()
  await task.getByRole('button', { name: 'Reopen task: Arrange a care check' }).click()
  await expect(task.getByText('Previous completion note')).toBeVisible()
  await expect(task.getByText('Refilled both water bowls.')).toBeVisible()
})
