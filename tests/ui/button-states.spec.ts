import { expect, test, type Locator } from '@playwright/test'

const story = '/iframe.html?id=actions-button--state-changes&viewMode=story'

async function bounds(buttons: Locator) {
  return buttons.evaluateAll((elements) => elements.map((element) => {
    const { x, y, width, height } = element.getBoundingClientRect()
    return { x: x + scrollX, y: y + scrollY, width, height }
  }))
}

for (const width of [390, 1440]) {
  test(`button labels and loading preserve layout at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto(story)
    await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), testInfo.project.name === 'dark')
    const next = page.getByRole('button', { name: 'Next state', exact: true })
    await expect(next).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    const buttons = page.getByRole('group').locator('[data-slot="button"]')
    await expect(buttons).toHaveCount(17)
    const initialBounds = await bounds(buttons)

    for (const state of ['Loading', 'Complete', 'Ready']) {
      await next.focus()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('status')).toHaveText(state)
      await expect.poll(() => bounds(buttons)).toEqual(initialBounds)
      for (const button of await buttons.all()) {
        if (state === 'Loading') {
          await expect(button).toHaveAttribute('aria-busy', 'true')
          if (await button.evaluate((element) => element.tagName === 'A')) {
            await expect(button).toHaveAttribute('aria-disabled', 'true')
          } else {
            await expect(button).toBeDisabled()
          }
          await expect(button.locator('[data-slot="loading-indicator"]')).toBeVisible()
        } else {
          await expect(button).not.toHaveAttribute('aria-busy')
          await expect(button).toBeEnabled()
        }
      }
      const name = state === 'Loading' ? 'Saving feeding visit' : state === 'Complete' ? 'Visit saved' : 'Save visit'
      await expect(page.getByRole('group', { name: 'default button', exact: true }).getByRole('button')).toHaveAccessibleName(name)
      await expect(page.getByRole('group', { name: 'Plain loading button', exact: true }).getByRole('button')).toHaveAccessibleName('Check access')
      await expect(page.getByRole('group', { name: 'icon button', exact: true }).getByRole('button')).toHaveAccessibleName('Add visit')
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('card action keeps its size after completion', async ({ page }) => {
  await page.goto('/iframe.html?id=display-card--with-action&viewMode=story')
  const button = page.getByRole('button', { name: 'Log visit', exact: true })
  await expect(button).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  const initialBounds = await bounds(button)
  await button.click()
  const saved = page.getByRole('button', { name: 'Logged', exact: true })
  await expect(saved).toBeDisabled()
  await expect.poll(() => bounds(saved)).toEqual(initialBounds)
})
