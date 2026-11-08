import { expect, test } from '@playwright/test'

for (const width of [320, 390, 1440]) {
  test(`reviewing requests keeps the team controls in place at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/iframe.html?id=pages-team--team&viewMode=story')
    await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
    await page.evaluate(() => document.fonts.ready)

    const heading = page.getByRole('heading', { name: '2 people are waiting to join' })
    const review = page.getByRole('button', { name: 'Review requests' })
    const card = page.locator('[data-slot="card"]').filter({ has: heading })
    const controls = page.getByRole('region', { name: 'Team controls' })
    const table = page.getByRole('region', { name: 'Team accounts', exact: true })
    const account = (name: string) => width < 768 ? table.getByRole('button', { name: new RegExp(`account: ${name}$`) }) : table.getByRole('row', { name: new RegExp(name) })
    await expect(review).toBeVisible()
    await expect(account('Sam Chen')).toBeVisible()
    const before = await Promise.all([card.boundingBox(), controls.boundingBox(), table.boundingBox()])

    await review.focus()
    await page.keyboard.press('Enter')
    const viewAll = page.getByRole('button', { name: 'View all accounts' })
    await expect(viewAll).toBeFocused()
    await expect(page.getByLabel('Filter accounts by access')).toHaveValue('pending')
    await expect(account('Jordan Lee')).toBeVisible()
    await expect(account('Sam Chen')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Clear filters' })).toHaveCount(0)
    const after = await Promise.all([card.boundingBox(), controls.boundingBox(), table.boundingBox()])
    for (let index = 0; index < before.length; index++) {
      expect(before[index]).not.toBeNull()
      expect(after[index]).not.toBeNull()
      expect(after[index]!.y).toBeCloseTo(before[index]!.y, 0)
    }
    expect(after[0]!.height).toBeCloseTo(before[0]!.height, 0)
    expect(after[1]!.height).toBeCloseTo(before[1]!.height, 0)

    await page.keyboard.press('Enter')
    await expect(review).toBeFocused()
    await expect(page.getByLabel('Filter accounts by access')).toHaveValue('all')
    await expect(account('Sam Chen')).toBeVisible()
  })
}

test('review requests clears search and keeps other filter reset actions available', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-team--team&viewMode=story')
  await page.getByRole('button', { name: 'Review requests' }).waitFor()
  const search = page.getByLabel('Search team accounts')
  const filter = page.getByLabel('Filter accounts by access')
  await search.fill('no match')
  await page.getByRole('button', { name: 'Review requests' }).click()
  await expect(search).toHaveValue('')
  await expect(filter).toHaveValue('pending')
  await search.fill('jordan')
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(search).toHaveValue('')
  await expect(filter).toHaveValue('all')
  await filter.selectOption('active')
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(filter).toHaveValue('all')
})
