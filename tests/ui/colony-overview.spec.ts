import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/images.unsplash.com/**', (route) => route.abort())
})

test('overview keeps progress separate from the directory and its result count', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-colonies-and-cats--colonies&viewMode=story')
  const nav = page.getByRole('navigation', { name: 'Workspace navigation' })
  await expect(page.getByRole('list', { name: 'Colony summary' })).toHaveCount(0)
  await expect(page.getByText('3 colonies', { exact: true })).toHaveCount(1)
  await nav.getByRole('link', { name: 'Overview', exact: true }).click()
  await expect(page.getByRole('progressbar')).toHaveCount(3)
  await expect(page.getByRole('list', { name: 'Colony summary' })).toHaveCount(0)
  await nav.getByRole('link', { name: 'Colonies', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Search colonies' }).fill('Canal')
  await expect(page.getByText('1 colony found', { exact: true })).toHaveCount(1)
  await page.getByRole('button', { name: 'Cards', exact: true }).click()
  await expect(page.getByText('1 colony found', { exact: true })).toHaveCount(1)
  await page.getByRole('searchbox', { name: 'Search colonies' }).fill('does-not-exist')
  await expect(page.getByText('0 colonies found', { exact: true })).toHaveCount(1)
})
