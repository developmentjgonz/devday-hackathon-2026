import { expect, test } from '@playwright/test'
import { expectFocusRing, fill, leavePointer } from './state-helpers'

test('the selected view stays visible on hover and keyboard focus', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/iframe.html?id=actions-view-switcher--default&viewMode=story')
  await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
  const group = page.getByRole('group', { name: 'Task view' })
  const cards = group.getByRole('button', { name: 'Cards' })
  const list = group.getByRole('button', { name: 'List' })
  await expect(cards).toHaveAttribute('aria-pressed', 'true')
  const selectedFill = await fill(cards)
  const idleFill = await fill(list)
  await cards.hover()
  expect(await fill(cards)).toBe(selectedFill)
  await list.hover()
  await expect.poll(() => fill(list)).not.toBe(idleFill)
  expect(await fill(cards)).toBe(selectedFill)
  await expect(cards).toHaveAttribute('aria-pressed', 'true')
  await leavePointer(page)
  await expectFocusRing(page, list)
  await page.keyboard.press('Space')
  await expect(list).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => fill(list)).toBe(selectedFill)
  const newSelectedFill = await fill(list)
  await list.hover()
  expect(await fill(list)).toBe(newSelectedFill)
})

test('selected corners follow the track at both ends', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/iframe.html?id=actions-view-switcher--cards-and-map&viewMode=story')
  await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
  const group = page.getByRole('group', { name: 'Cat view' })

  for (const [label, edge] of [['Cards', 'left'], ['Map', 'right']] as const) {
    const button = group.getByRole('button', { name: label })
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    const corners = await button.evaluate((element, edge) => {
      const track = element.parentElement!
      const trackBox = track.getBoundingClientRect()
      const buttonBox = element.getBoundingClientRect()
      const trackStyle = getComputedStyle(track)
      const buttonStyle = getComputedStyle(element)
      return {
        horizontalInset: edge === 'left' ? buttonBox.left - trackBox.left : trackBox.right - buttonBox.right,
        verticalInset: buttonBox.top - trackBox.top,
        outerRadius: parseFloat(edge === 'left' ? trackStyle.borderTopLeftRadius : trackStyle.borderTopRightRadius),
        innerRadius: parseFloat(edge === 'left' ? buttonStyle.borderTopLeftRadius : buttonStyle.borderTopRightRadius),
      }
    }, edge)
    expect(corners.horizontalInset).toBeCloseTo(corners.verticalInset, 1)
    expect(corners.innerRadius + corners.verticalInset).toBeCloseTo(corners.outerRadius, 1)
  }
})

