import { expect, test } from '@playwright/test'

test('a record avatar falls back when its image cannot load', async ({ page }) => {
  await page.route('**/photo-1514888286974-6c03e2ca1dba**', (route) => route.abort())
  await page.goto('/iframe.html?id=display-record-avatar--cat-photo&viewMode=story')
  await expect(page.getByRole('img', { name: 'Pepper, no photo' })).toBeVisible()
})
