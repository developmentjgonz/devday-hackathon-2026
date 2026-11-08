import { expect, test, type Locator, type Page } from '@playwright/test'

const story = '/iframe.html?id=actions-workspace-navigation--overview-current&viewMode=story'
const background = (link: Locator) => link.evaluate((element) => getComputedStyle(element).backgroundColor)

async function openNavigation(page: Page, dark: boolean) {
  await page.goto(story)
  await page.evaluate((enabled) => document.documentElement.classList.toggle('dark', enabled), dark)
  const navigation = page.getByRole('navigation', { name: 'Workspace navigation' })
  await expect(navigation).toBeVisible()
  return {
    navigation,
    overview: navigation.getByRole('link', { name: 'Overview', exact: true }),
    inbox: navigation.getByRole('link', { name: 'Inbox', exact: true }),
  }
}

for (const width of [390, 1440]) {
  test(`hover preserves one distinct current item at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const { navigation, overview, inbox } = await openNavigation(page, testInfo.project.name === 'dark')
    await expect(overview).toHaveAttribute('aria-current', 'page')
    const selectedFill = await background(overview)
    const idleFill = await background(inbox)

    // Hover the current link, then another link: neither action selects a route.
    await overview.hover()
    expect(await background(overview)).toBe(selectedFill)
    await inbox.hover()
    const hoverFill = await background(inbox)
    expect(hoverFill).not.toBe(idleFill)
    expect(hoverFill).not.toBe(selectedFill)
    expect(await background(overview)).toBe(selectedFill)
    await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1)
    await expect(overview).toHaveAttribute('aria-current', 'page')

    // Click transfers selection. Clicking the current link preserves it.
    await inbox.click()
    await expect(inbox).toHaveAttribute('aria-current', 'page')
    expect(await background(inbox)).toBe(selectedFill)
    await inbox.click()
    await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1)
    await overview.hover()
    expect(await background(overview)).not.toBe(selectedFill)
    await page.mouse.move(width - 1, 899)
    expect(await background(overview)).toBe(idleFill)

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('keyboard focus is visible and Enter changes the current route', async ({ page }, testInfo) => {
  const { navigation, overview, inbox } = await openNavigation(page, testInfo.project.name === 'dark')
  const selectedFill = await background(overview)
  await page.keyboard.press('Tab')
  await expect(overview).toBeFocused()
  expect(await overview.evaluate((element) => element.matches(':focus-visible'))).toBe(true)
  const currentRing = await overview.evaluate((element) => getComputedStyle(element).boxShadow)
  expect(currentRing).not.toBe('none')
  expect(await background(overview)).toBe(selectedFill)

  await page.keyboard.press('Tab')
  await expect(inbox).toBeFocused()
  expect(await inbox.evaluate((element) => getComputedStyle(element).boxShadow)).toBe(currentRing)
  expect(await background(inbox)).not.toBe(selectedFill)
  await page.keyboard.press('Enter')
  await expect(inbox).toHaveAttribute('aria-current', 'page')
  await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1)
})

test('touch changes the route without a stuck hover on the previous item', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL, hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })
  try {
    const page = await context.newPage()
    const { overview, inbox } = await openNavigation(page, testInfo.project.name === 'dark')
    const selectedFill = await background(overview)
    const idleFill = await background(inbox)
    await inbox.tap()
    await expect(inbox).toHaveAttribute('aria-current', 'page')
    expect(await background(overview)).toBe(idleFill)
    expect(await background(inbox)).toBe(selectedFill)
    await overview.tap()
    await expect(overview).toHaveAttribute('aria-current', 'page')
    expect(await background(inbox)).toBe(idleFill)
  } finally {
    await context.close()
  }
})
