import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/images.unsplash.com/**', (route) => route.abort())
})

test('report counts update when a review is finished or moved to waiting', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-my-tasks--progress-overview&viewMode=story')
  const nav = page.getByRole('navigation', { name: 'Workspace navigation' })
  const reports = page.getByRole('region', { name: 'Report reviews' })
  await expect(reports).toContainText('4 pending review')
  await expect(reports).toContainText('1 waiting for details')
  await page.getByRole('link', { name: 'View reports' }).click()
  await page.getByRole('button', { name: 'Review Possible injury near the feeding station', exact: true }).click()
  await page.getByRole('button', { name: 'Ask for details', exact: true }).click()
  await page.getByLabel('Question', { exact: true }).fill('Which fence was Pepper near?')
  await page.getByRole('button', { name: 'Add question and wait', exact: true }).click()
  await nav.getByRole('link', { name: 'Overview', exact: true }).click()
  await expect(reports).toContainText('3 pending review')
  await expect(reports).toContainText('2 waiting for details')
  await page.getByRole('link', { name: 'View reports' }).click()
  await page.getByRole('button', { name: 'Review Three kittens spotted behind the shed', exact: true }).click()
  await page.getByRole('button', { name: 'Save and finish', exact: true }).click()
  await nav.getByRole('link', { name: 'Overview', exact: true }).click()
  await expect(reports).toContainText('2 pending review')
  await expect(reports).toContainText('2 waiting for details')
})
