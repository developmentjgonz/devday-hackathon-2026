import { expect, test, type Page } from '@playwright/test'

async function open(page: Page, id: string, dark: boolean) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/iframe.html?id=${id}&viewMode=story`)
  await expect(page.locator('#storybook-root > *').first()).toBeVisible()
  await page.evaluate((enabled) => document.documentElement.classList.toggle('dark', enabled), dark)
}

async function leaveForOverview(page: Page) {
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('dialog', { name: 'Menu', exact: true }).getByRole('link', { name: 'Overview', exact: true }).click()
}

test.use({ viewport: { width: 320, height: 740 } })

test('profile edits survive cancelled navigation and can be discarded', async ({ page }, info) => {
  await open(page, 'pages-profile--profile', info.project.name === 'dark')
  await page.getByLabel('Name', { exact: true }).fill('Maya Updated')
  await leaveForOverview(page)
  const discard = page.getByRole('dialog', { name: 'Discard changes?' })
  await expect(discard).toBeVisible()
  await discard.getByRole('button', { name: 'Keep editing' }).click()
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Maya Updated')
  await leaveForOverview(page)
  await discard.getByRole('button', { name: 'Discard changes', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Overview', exact: true, level: 1 })).toBeVisible()
})

test('configuration keeps drafts between sections and warns until every section is saved', async ({ page }, info) => {
  await open(page, 'pages-configuration--communication-setup', info.project.name === 'dark')
  await page.getByLabel('Phone number', { exact: true }).fill('+1 305 555 0123')
  const nav = page.getByRole('navigation', { name: 'Configuration sections' })
  await nav.getByRole('link', { name: 'AI features', exact: true }).click()
  await page.getByLabel('OpenAI model', { exact: true }).fill('example-model')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled()
  await leaveForOverview(page)
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click()
  await nav.getByRole('link', { name: 'Communication setup', exact: true }).click()
  await expect(page.getByLabel('Phone number', { exact: true })).toHaveValue('+1 305 555 0123')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled()
  await leaveForOverview(page)
  await expect(page.getByRole('heading', { name: 'Overview', exact: true, level: 1 })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Discard changes?' })).toHaveCount(0)
})

test('full cat and colony names remain readable inside a narrow profile', async ({ page }, info) => {
  await open(page, 'pages-colonies-and-cats--long-cat-profile', info.project.name === 'dark')
  const details = page.getByRole('region', { name: 'Details', exact: true })
  const name = 'TheVeryLongUnbrokenCatNameThatNeedsToWrapOnSmallScreens'
  const colony = details.getByRole('link', { name: 'TheVeryLongUnbrokenColonyNameThatNeedsToWrapOnSmallScreens' })
  await expect(details.getByRole('heading', { name, exact: true })).toBeVisible()
  await expect(page).toHaveTitle(`${name} · Mews`)
  const back = page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Cats', exact: true })
  expect((await back.boundingBox())!.width).toBeGreaterThan(30)
  await expect(colony).toBeVisible()
  const fits = await colony.evaluate((element) => {
    const frame = element.closest('[data-slot="card-content"]')!.getBoundingClientRect()
    const link = element.getBoundingClientRect()
    return link.left >= frame.left && link.right <= frame.right && element.scrollWidth <= element.clientWidth + 1
  })
  expect(fits).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('long contact addresses and error text stay inside their surfaces', async ({ page }, info) => {
  const email = 'community-garden-reporting-team@northwest-neighborhood-rescue-and-care.example.org'
  await page.route('**/api/public-reports/contact', (route) => route.fulfill({ json: { phone: null, email, chatAvailable: false } }))
  await open(page, 'pages-public-report--form', info.project.name === 'dark')
  const contact = page.getByRole('link', { name: email, exact: true })
  await expect(contact).toBeVisible()
  expect(await contact.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await open(page, 'feedback-alert--long-error', info.project.name === 'dark')
  const alert = page.getByRole('alert')
  await expect(alert).toContainText('CommunityGardenFeedingStation')
  expect(await alert.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
})

test('tall popovers keep the last action reachable on a short screen', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 360 })
  await open(page, 'overlays-popover--long-content', info.project.name === 'dark')
  await page.getByRole('button', { name: 'Open care options' }).click()
  const popup = page.getByRole('dialog')
  await expect(popup).toBeVisible()
  const bounds = await popup.boundingBox()
  expect(bounds!.y).toBeGreaterThanOrEqual(10)
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(350)
  const last = popup.getByRole('button', { name: 'Care action 15', exact: true })
  await last.focus()
  await last.click()
  await expect(popup).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Open care options' })).toBeFocused()
})

test('directory controls fit when the user doubles the text size', async ({ page }, info) => {
  await open(page, 'pages-colonies-and-cats--colonies', info.project.name === 'dark')
  await expect(page.getByRole('group', { name: 'Colony view', exact: true })).toBeVisible()
  await page.evaluate(() => document.documentElement.style.fontSize = '32px')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  for (const name of ['List', 'Cards', 'Map']) await expect(page.getByRole('button', { name, exact: true })).toBeVisible()
})

for (const [story, role, label] of [
  ['forms-checkbox--disabled', 'checkbox', 'Fresh water provided'],
  ['forms-switch--disabled', 'switch', 'Show phone number'],
] as const) {
  test(`disabled ${role} and label show that the setting is unavailable`, async ({ page }, info) => {
    await open(page, story, info.project.name === 'dark')
    await expect(page.getByRole(role, { name: label })).toBeDisabled()
    await expect(page.getByRole(role, { name: label })).toHaveCSS('opacity', '0.5')
    await expect(page.getByText(label, { exact: true })).toHaveCSS('opacity', '0.5')
  })
}

test('danger buttons and badges retain readable contrast in both themes', async ({ page }, info) => {
  for (const id of ['foundations-interaction-states--buttons', 'display-badge--destructive']) {
    await open(page, id, info.project.name === 'dark')
    const control = id.includes('buttons') ? page.getByRole('button', { name: 'destructive action', exact: true }) : page.locator('[data-slot="badge"]')
    await expect(control).toBeVisible()
    const contrast = () => control.evaluate((element) => {
      const styles = getComputedStyle(element)
      const luminance = (color: string) => {
        const channels = color.match(/[\d.]+/g)!.slice(0, 3).map((value) => {
          const channel = Number(value) / 255
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
        })
        return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
      }
      const [lower, upper] = [luminance(styles.color), luminance(styles.backgroundColor)].sort((a, b) => a - b)
      return (upper! + 0.05) / (lower! + 0.05)
    })
    await expect.poll(contrast).toBeGreaterThanOrEqual(4.5)
    if (id.includes('buttons')) {
      await control.hover()
      await expect.poll(contrast).toBeGreaterThanOrEqual(4.5)
    }
  }
})

test.describe('touch screens', () => {
  test.use({ hasTouch: true, isMobile: true })

  for (const width of [390, 820]) {
    test(`fields keep readable text and full touch targets at ${width}px`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 900 })
      await open(page, 'pages-my-tasks--focused-tasks', info.project.name === 'dark')
      for (const control of [page.getByLabel('Search my tasks'), page.getByLabel('Filter tasks by status'), page.getByRole('button', { name: 'New task', exact: true })]) {
        await expect(control).toBeVisible()
        expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      }
      await page.getByRole('button', { name: 'New task', exact: true }).tap()
      for (const field of [page.getByLabel('What needs to happen?', { exact: true }), page.getByLabel('Assign to', { exact: true }), page.getByLabel('Due date (optional)')]) {
        expect(await field.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16)
      }
      await page.getByRole('button', { name: 'Close new task' }).tap()
      await open(page, 'pages-profile--profile', info.project.name === 'dark')
      await expect(page.getByRole('button', { name: 'Change photo', exact: true })).toBeVisible()
      await expect(page.locator('input[type="file"]')).toBeHidden()
    })
  }

  for (const [story, role, label] of [
    ['forms-checkbox--default', 'checkbox', 'Fresh water provided'],
    ['forms-switch--off', 'switch', 'Show phone number'],
  ] as const) {
    test(`${role} accepts taps in the full target and on its label`, async ({ page }, info) => {
      await open(page, story, info.project.name === 'dark')
      const control = page.getByRole(role, { name: label })
      await expect(control).not.toBeChecked()
      const box = (await control.boundingBox())!
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2 + 20)
      await expect(control).toBeChecked()
      const text = page.getByText(label, { exact: true })
      expect((await text.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      await text.tap()
      await expect(control).not.toBeChecked()
    })
  }
})
