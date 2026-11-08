import { expect, test } from '@playwright/test'
import { openWorkspaceNavigation } from './state-helpers'

for (const width of [320, 1440]) {
  test(`workspace title follows navigation and actions stay available at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/iframe.html?id=pages-dashboard--overview&viewMode=story', { waitUntil: 'domcontentloaded' })
    await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
    const header = page.getByRole('banner', { name: 'Workspace header' })
    const navigate = async (name: string) => (await openWorkspaceNavigation(page)).getByRole('link', { name, exact: true }).click()
    await expect(header.getByRole('heading', { level: 1, name: 'Overview', exact: true })).toBeVisible()
    await navigate('Reports')
    await expect(header.getByRole('heading', { level: 1, name: 'Reports', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(page.getByRole('main')).toHaveAccessibleName('Reports')
    await expect(page.getByText('Review incoming reports and update care records.')).toHaveCount(0)

    await navigate('Overview')
    await expect(header.getByRole('button', { name: 'New report', exact: true })).toHaveCount(0)
    await navigate('Reports')
    await page.getByRole('region', { name: 'Table controls', exact: true }).getByRole('button', { name: 'New report', exact: true }).click()
    const composer = page.getByRole('dialog', { name: 'New report' })
    await expect(composer).toBeVisible()
    await composer.getByLabel('What happened?').fill('Morning feeding complete')
    await composer.getByLabel('Details', { exact: true }).fill('Food and clean water are available.')
    await composer.getByRole('button', { name: 'Submit report', exact: true }).click()
    const review = page.getByRole('dialog', { name: 'Morning feeding complete' })
    await expect(review).toBeVisible()
    await expect(review).toHaveAccessibleDescription(/Report added\./)
    await expect(page.locator('[data-slot="drawer-content"]')).toHaveCount(1)
    await expect(review).toHaveCSS('animation-name', 'none')
    await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCSS('animation-name', 'none')
    await review.getByRole('button', { name: 'Close report', exact: true }).click()
    await page.getByRole('searchbox', { name: 'Search reports' }).fill('Morning feeding complete')
    await page.getByRole('button', { name: 'Review Morning feeding complete', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Morning feeding complete' })).not.toContainText('Report added.')
    await page.getByRole('button', { name: 'Close report', exact: true }).click()
    await expect(header.getByRole('heading', { level: 1, name: 'Reports', exact: true })).toBeVisible()
    await header.getByRole('button', { name: /Notifications:/ }).click()
    await expect(page.getByRole('dialog', { name: 'Notifications' })).toBeVisible()
    await page.keyboard.press('Escape')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })

  test(`workspace header stays at the top while reports scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 })
    await page.goto('/iframe.html?id=pages-reports--busy-inbox&viewMode=story', { waitUntil: 'domcontentloaded' })
    const header = page.getByRole('banner', { name: 'Workspace header' })
    await expect(header.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible()
    const pageCanScroll = await page.evaluate(() => document.documentElement.scrollHeight > innerHeight)
    if (pageCanScroll) {
      await page.evaluate(() => window.scrollTo(0, 1200))
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    } else {
      const tableViewport = page.locator('.mews-table-scroll')
      await tableViewport.evaluate((element) => { element.scrollTop = element.scrollHeight })
      await expect.poll(() => tableViewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    }
    const expectedTop = width < 768 ? (await page.locator('aside').boundingBox())!.height : 0
    await expect.poll(async () => (await header.boundingBox())?.y).toBe(expectedTop)
    if (width < 768) await expect(page.getByRole('button', { name: 'Open menu' })).toBeInViewport()
    await expect(header.getByRole('button', { name: 'New report', exact: true })).toHaveCount(0)
    await expect(header.getByRole('button', { name: /Notifications:/ })).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('long breadcrumb paths fit a narrow screen and parent links return to Reports', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/iframe.html?id=navigation-workspace-header--long-page-name&viewMode=story', { waitUntil: 'domcontentloaded' })
  const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb', exact: true })
  await expect(breadcrumb.getByRole('heading', { level: 1 })).toContainText('Follow-up care')
  await expect(breadcrumb.locator('[aria-current="page"]')).toHaveCount(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await breadcrumb.getByRole('link', { name: 'Reports', exact: true }).click()
  await expect(breadcrumb.getByRole('heading', { level: 1, name: 'Reports', exact: true })).toBeVisible()
  await expect(breadcrumb.getByRole('link')).toHaveCount(0)
})
