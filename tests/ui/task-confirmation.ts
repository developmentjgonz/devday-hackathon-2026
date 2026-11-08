import type { Page } from '@playwright/test'

export async function confirmTaskCompletion(page: Page, note?: string) {
  const dialog = page.getByRole('dialog', { name: 'Complete this task?' })
  if (note !== undefined) await dialog.getByLabel('Completion note (optional)').fill(note)
  await dialog.getByRole('button', { name: 'Complete task', exact: true }).click()
}
