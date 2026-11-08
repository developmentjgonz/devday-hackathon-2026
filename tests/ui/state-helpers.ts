import { expect, type Locator, type Page } from '@playwright/test'

export async function openStateStory(page: Page, name: string, dark: boolean) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/iframe.html?id=foundations-interaction-states--${name}&viewMode=story`)
  await expect(page.locator('#storybook-root')).not.toBeEmpty()
  await page.evaluate(async (enabled) => {
    document.documentElement.classList.toggle('dark', enabled)
    await document.fonts.ready
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
  }, dark)
}

export const fill = (target: Locator) => target.evaluate((element) => getComputedStyle(element).backgroundColor)

export const appearance = (target: Locator) => target.evaluate((element) => {
  const style = getComputedStyle(element)
  return [style.backgroundColor, style.color, style.borderColor, style.textDecorationLine, style.boxShadow, style.outlineStyle, style.outlineWidth, style.opacity]
})

export async function keyboardFocus(page: Page, target: Locator) {
  for (let step = 0; step < 100; step++) {
    await page.keyboard.press('Tab')
    if (await target.evaluate((element) => element === document.activeElement)) return
  }
  throw new Error('Control cannot be reached with Tab')
}

export async function expectFocusRing(page: Page, target: Locator) {
  const indicator = () => target.evaluate((element) => {
    const style = getComputedStyle(element)
    return [style.boxShadow, style.outlineStyle, style.outlineWidth, style.outlineColor]
  })
  if (await target.evaluate((element) => element === document.activeElement && element.matches(':focus-visible'))) {
    // Overlays may put keyboard focus on their first control when they open.
    // Moving Tab outside a nonmodal popover would dismiss it.
    await expect.poll(() => target.evaluate((element) => {
      const style = getComputedStyle(element)
      return style.boxShadow !== 'none' || (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0)
    })).toBe(true)
    return
  }
  const idle = await indicator()
  await keyboardFocus(page, target)
  await expect(target).toBeFocused()
  expect(await target.evaluate((element) => element.matches(':focus-visible'))).toBe(true)
  await expect.poll(indicator).not.toEqual(idle)
}

export async function leavePointer(page: Page) {
  await page.mouse.move(0, 0)
}
