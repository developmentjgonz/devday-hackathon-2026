import { expect, test } from '@playwright/test'

for (const width of [390, 1440]) {
  test(`recovery page shows its illustration and actions at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/iframe.html?id=pages-error-page--workspace&viewMode=story')
    await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')

    await expect(page.getByRole('heading', { name: 'Something went wrong', level: 1 })).toBeVisible()
    const cat = page.locator('main img[alt=""]')
    await expect(cat).toBeVisible()
    await expect.poll(() => cat.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
    await expect(cat.locator('..')).toHaveAttribute('aria-hidden', 'true')
    await expect(page.getByRole('link', { name: 'Back to overview' })).toHaveAttribute('href', '/app')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    await Promise.all([
      page.waitForEvent('load'),
      page.getByRole('button', { name: 'Reload page' }).click(),
    ])
    await expect(page.getByRole('heading', { name: 'Something went wrong', level: 1 })).toBeVisible()
  })
}

test('public recovery page links back home', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-error-page--public&viewMode=story')
  await expect(page.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
})
