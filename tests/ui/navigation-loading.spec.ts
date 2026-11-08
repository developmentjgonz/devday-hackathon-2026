import { expect, test } from '@playwright/test'

const story = '/iframe.html?id=feedback-navigation-loading--route-transitions&viewMode=story'
test.setTimeout(60000)

test('a slow navigation shows the shared loader without moving the page', async ({ page }) => {
  await page.goto(story)
  const slow = page.getByRole('link', { name: 'Open slow page' })
  await expect(slow).toBeVisible()
  const before = await slow.boundingBox()
  await slow.click()
  const notice = page.locator('[data-sonner-toast]').filter({ hasText: 'Opening page…' })
  await expect(notice).toBeVisible()
  await expect(notice.locator('[data-slot="loading-indicator"]')).toBeVisible()
  expect((await slow.boundingBox())?.y).toBeCloseTo(before!.y, 0)
  await page.evaluate(() => window.dispatchEvent(new Event('storybook:release-navigation')))
  await expect(page.getByRole('heading', { name: 'Slow page' })).toBeVisible()
  await expect(notice).toBeHidden()
})

test('fast and cancelled navigation leave no loading notice', async ({ page }) => {
  await page.goto(story)
  await page.getByRole('link', { name: 'Open fast page' }).click()
  await expect(page.getByRole('heading', { name: 'Fast page' })).toBeVisible()
  await expect(page.getByText('Opening page…')).toHaveCount(0)
  await page.getByRole('link', { name: 'Open slow page' }).click()
  const notice = page.locator('[data-sonner-toast]').filter({ hasText: 'Opening page…' })
  await expect(notice).toBeVisible()
  await page.getByRole('link', { name: 'Open fast page' }).click()
  await expect(notice).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Fast page' })).toBeVisible()
})
