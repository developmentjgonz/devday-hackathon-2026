import { expect, test } from '@playwright/test'

const memberStory = '/iframe.html?id=navigation-workspace-menu--member&viewMode=story'

for (const width of [320, 390]) {
  test(`phone menu shows navigation and account actions at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto(memberStory)
    await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
    const trigger = page.getByRole('button', { name: 'Open menu', exact: true })
    await expect(trigger).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Workspace navigation' })).toHaveCount(0)
    await trigger.focus()
    await page.keyboard.press('Enter')
    const menu = page.getByRole('dialog', { name: 'Menu', exact: true })
    await expect(menu).toBeVisible()
    const navigation = menu.getByRole('navigation', { name: 'Workspace navigation' })
    for (const name of ['Overview', 'Colonies', 'Cats', 'Reports', 'My Tasks']) {
      await expect(navigation.getByRole('link', { name, exact: true })).toBeVisible()
    }
    await expect(navigation.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
    await expect(navigation.getByRole('link', { name: 'Team', exact: true })).toHaveCount(0)
    await expect(menu.getByText('Maya Rivera')).toBeVisible()
    const profile = menu.getByRole('link', { name: 'Profile', exact: true })
    const signOut = menu.getByRole('button', { name: 'Sign out', exact: true })
    await expect(profile).toBeVisible()
    await expect(signOut).toBeVisible()
    const rows = [navigation.getByRole('link', { name: 'Overview' }), profile, signOut]
    const geometry = await Promise.all(rows.map((row) => row.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const icon = element.querySelector('svg')!.getBoundingClientRect()
      const style = getComputedStyle(element)
      return { height: rect.height, iconSize: icon.width, iconInset: icon.left - rect.left, gap: style.gap, font: style.fontFamily, fontSize: style.fontSize }
    })))
    expect(geometry[1]).toEqual(geometry[0])
    expect(geometry[2]).toEqual(geometry[0])
    expect((await menu.boundingBox())!.width).toBeLessThan(width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    for (const key of ['Tab', 'Tab', 'Tab', 'Shift+Tab']) {
      await page.keyboard.press(key)
      await expect.poll(() => menu.evaluate((element) => element.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(menu).not.toBeVisible()
    await expect(trigger).toBeFocused()
    await trigger.click()
    await page.mouse.click(5, 400)
    await expect(menu).not.toBeVisible()
    await expect(trigger).toBeFocused()
  })
}

test('navigation and profile close the menu and focus the destination', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(memberStory)
  const trigger = page.getByRole('button', { name: 'Open menu', exact: true })
  await trigger.click()
  let menu = page.getByRole('dialog', { name: 'Menu', exact: true })
  await menu.getByRole('link', { name: 'Reports', exact: true }).click()
  await expect(menu).not.toBeVisible()
  await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible()
  await expect(page.locator('#main-content')).toBeFocused()

  await trigger.click()
  menu = page.getByRole('dialog', { name: 'Menu', exact: true })
  await expect(menu.getByRole('link', { name: 'Reports' })).toHaveAttribute('aria-current', 'page')
  await menu.getByRole('link', { name: 'Profile', exact: true }).click()
  await expect(menu).not.toBeVisible()
  await expect(page.getByRole('heading', { name: 'Profile', level: 1 })).toBeVisible()
  await expect(page.locator('#main-content')).toBeFocused()

  await trigger.click()
  menu = page.getByRole('dialog', { name: 'Menu', exact: true })
  await menu.getByRole('link', { name: 'Profile', exact: true }).click()
  await expect(menu).not.toBeVisible()
  await expect(trigger).toBeFocused()
})

test('administrator menu includes Team and closes when the desktop layout appears', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/iframe.html?id=navigation-workspace-menu--administrator&viewMode=story')
  await page.getByRole('button', { name: 'Open menu' }).click()
  const menu = page.getByRole('dialog', { name: 'Menu' })
  await expect(menu.getByRole('link', { name: 'Team', exact: true })).toBeVisible()
  await page.setViewportSize({ width: 1024, height: 844 })
  await expect(menu).not.toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('link', { name: 'Team', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open menu' })).toHaveCount(0)
})

test('the navigation preview matches the app at phone and desktop widths', async ({ page }) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/iframe.html?id=actions-workspace-navigation--overview-current&viewMode=story')
    const preview = page.getByRole('navigation', { name: 'Workspace navigation' })
    await expect(preview).toBeVisible()
    const previewWidth = (await preview.boundingBox())!.width
    await page.goto(memberStory)
    if (width < 768) await page.getByRole('button', { name: 'Open menu' }).click()
    const actual = page.getByRole('navigation', { name: 'Workspace navigation' })
    await expect(actual).toBeVisible()
    expect((await actual.boundingBox())!.width).toBeCloseTo(previewWidth, 1)
  }
})

test('modified navigation does not dismiss the current menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(memberStory)
  await page.getByRole('button', { name: 'Open menu' }).click()
  const menu = page.getByRole('dialog', { name: 'Menu' })
  const cats = menu.getByRole('link', { name: 'Cats', exact: true })
  await cats.click({ modifiers: ['Meta'] })
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
})

test('a long name and the account actions fit on a short phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 360 })
  await page.goto('/iframe.html?id=navigation-workspace-menu--long-name&viewMode=story')
  await page.getByRole('button', { name: 'Open menu' }).click()
  const menu = page.getByRole('dialog', { name: 'Menu' })
  await expect(menu.getByText('Alexandria Morgan-Rivera de la Cruz and family')).toBeVisible()
  await expect(menu.getByRole('link', { name: 'Profile' })).toBeInViewport()
  await expect(menu.getByRole('button', { name: 'Sign out' })).toBeInViewport()
  await menu.getByRole('link', { name: 'My Tasks' }).click()
  await expect(page.getByRole('heading', { name: 'My Tasks', level: 1 })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('sign out reports failures in the menu and leaves the action available', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/api/auth/sign-out', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Unavailable' }) }))
  await page.goto(memberStory)
  await page.getByRole('button', { name: 'Open menu' }).click()
  const menu = page.getByRole('dialog', { name: 'Menu' })
  await menu.getByRole('button', { name: 'Sign out' }).click()
  await expect(menu.getByRole('alert')).toContainText('Could not sign out. Try again.')
  await expect(menu.getByRole('button', { name: 'Sign out' })).toBeEnabled()
})

test('sign out uses the account endpoint and closes the menu on success', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  let requests = 0
  await page.route('**/api/auth/sign-out', (route) => { requests++; return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }) })
  await page.goto(memberStory)
  await page.getByRole('button', { name: 'Open menu' }).click()
  const menu = page.getByRole('dialog', { name: 'Menu' })
  await menu.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible()
  await expect(menu).not.toBeVisible()
  expect(requests).toBe(1)
})

test('navigation shows press feedback without leaving a touch hover behind', async ({ browser }, info) => {
  const context = await browser.newContext({ baseURL: info.project.use.baseURL, hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })
  try {
    const page = await context.newPage()
    await page.goto(memberStory)
    await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
    await page.getByRole('button', { name: 'Open menu' }).tap()
    const menu = page.getByRole('dialog', { name: 'Menu' })
    const overview = menu.getByRole('link', { name: 'Overview', exact: true })
    const selected = await overview.evaluate((element) => getComputedStyle(element).backgroundColor)
    const currentBox = (await overview.boundingBox())!
    await page.mouse.move(currentBox.x + currentBox.width / 2, currentBox.y + currentBox.height / 2)
    await page.mouse.down()
    await expect(overview).toHaveCSS('background-color', selected)
    await page.mouse.up()
    await page.getByRole('button', { name: 'Open menu' }).tap()
    const cats = menu.getByRole('link', { name: 'Cats', exact: true })
    const idle = await cats.evaluate((element) => getComputedStyle(element).backgroundColor)
    const box = (await cats.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await expect.poll(() => cats.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(idle)
    await page.mouse.up()
    await expect(page.getByRole('heading', { name: 'Cats', level: 1 })).toBeVisible()
    await page.getByRole('button', { name: 'Open menu' }).tap()
    await expect(menu.getByRole('link', { name: 'Colonies', exact: true })).toHaveCSS('background-color', idle)
  } finally {
    await context.close()
  }
})
