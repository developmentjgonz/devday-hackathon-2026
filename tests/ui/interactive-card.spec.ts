import { expect, test } from '@playwright/test'
import { expectFocusRing, fill, leavePointer } from './state-helpers'

test('an interactive card responds to hover and keyboard focus', async ({ page }, info) => {
  await page.goto('/iframe.html?id=display-card--interactive&viewMode=story')
  await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
  const card = page.getByRole('link', { name: /Canal colony/ })
  const idle = await fill(card)
  await card.hover()
  await expect.poll(() => fill(card)).not.toBe(idle)
  await leavePointer(page)
  await expectFocusRing(page, card)
})
