import { expect, test } from '@playwright/test'

for (const width of [320, 390, 1440]) {
  test(`notifications leave drawer actions clear at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/iframe.html?id=feedback-notifications--above-drawer-actions&viewMode=story')
    await page.getByRole('button', { name: 'Open editor with confirmation' }).click()
    const drawer = page.getByRole('dialog', { name: 'Edit cat profile' })
    const notice = page.getByRole('listitem').filter({ hasText: 'Cat added' })
    const footer = drawer.locator('[data-slot="drawer-footer"]')
    await expect(notice).toBeVisible()
    await expect.poll(async () => {
      const toastBox = await notice.boundingBox()
      const footerBox = await footer.boundingBox()
      return Boolean(toastBox && footerBox && toastBox.y + toastBox.height < footerBox.y)
    }).toBe(true)
    await drawer.getByRole('button', { name: 'Save profile' }).click()
    await expect(drawer).toHaveCount(0)
    await expect.poll(async () => {
      const box = await notice.boundingBox()
      return box ? 720 - box.y - box.height : -1
    }).toBeCloseTo(width <= 600 ? 16 : 32, 0)
  })
}
