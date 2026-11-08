import { expect, test } from '@playwright/test'

for (const width of [320, 390, 1024]) {
  test(`task drawer scrolls its body with fixed header and actions at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 600 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/iframe.html?id=pages-my-tasks--focused-tasks&viewMode=story')
    await page.evaluate((enabled) => document.documentElement.classList.toggle('dark', enabled), info.project.name === 'dark')
    const trigger = page.getByRole('region', { name: 'Task controls', exact: true }).getByRole('button', { name: 'New task', exact: true })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'New task', exact: true })
    const body = dialog.locator('[data-slot="drawer-body"]')
    await expect(dialog).toHaveCSS('overflow-y', 'hidden')
    await expect(dialog.getByRole('button', { name: 'Create task', exact: true })).toBeInViewport()
    const header = dialog.locator('[data-slot="drawer-header"]')
    const footer = dialog.locator('[data-slot="drawer-footer"]')
    const before = { header: await header.boundingBox(), footer: await footer.boundingBox() }
    expect(await body.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
    await body.evaluate((element) => { element.scrollTop = element.scrollHeight })
    await expect.poll(() => body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    expect(await header.boundingBox()).toEqual(before.header)
    expect(await footer.boundingBox()).toEqual(before.footer)
    expect(await dialog.evaluate((element) => element.scrollTop)).toBe(0)
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
  })
}
