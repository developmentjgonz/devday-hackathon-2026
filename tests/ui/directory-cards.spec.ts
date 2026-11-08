import { expect, test } from '@playwright/test'
import { expectFocusRing, openWorkspaceNavigation } from './state-helpers'

const story = '/iframe.html?id=pages-colonies-and-cats--colonies&viewMode=story'
const edgeStory = '/iframe.html?id=pages-colonies-and-cats--long-names-and-no-reports&viewMode=story'
const longColony = 'TheVeryLongUnbrokenColonyNameThatNeedsToWrapOnSmallScreens'
const longCat = 'TheVeryLongUnbrokenCatNameThatNeedsToWrapOnSmallScreens'

test('visual cards show current details and open their records by keyboard', async ({ page }, info) => {
  await page.goto(story)
  await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
  await page.getByRole('button', { name: 'Cards', exact: true }).click()
  const colony = page.getByRole('link', { name: 'Canal', exact: true })
  await expect(colony).toContainText('1 known cat')
  await expect(colony).toContainText('3 open tasks')
  await expect(colony).not.toContainText(/feeding report/i)
  await expect(colony.getByRole('img', { name: 'Canal, no photo' })).toBeVisible()
  await page.getByRole('button', { name: 'List', exact: true }).click()
  await expect(colony).toContainText('known cat')
  await expect(colony).toContainText('open tasks')
  await expect(colony).not.toContainText(/feeding report/i)
  await page.getByRole('button', { name: 'Cards', exact: true }).click()
  await expectFocusRing(page, colony)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Canal', level: 1 })).toBeVisible()

  const cat = page.getByRole('link', { name: 'Miso', exact: true })
  await expect(cat.getByRole('img', { name: 'Miso, no photo' })).toBeVisible()
  await expect(cat).not.toContainText('Canal')
  await cat.click()
  await expect(page.getByRole('heading', { name: 'Miso', level: 1 })).toBeVisible()
})

test('long names and missing information fit the cards on a narrow screen', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto(edgeStory)
  await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
  await page.getByRole('button', { name: 'Cards', exact: true }).click()
  const colony = page.getByRole('link', { name: longColony, exact: true })
  await expect(colony).not.toContainText(/feeding report/i)
  await expect(colony).toContainText('0 open tasks')
  await expect(page.getByRole('img', { name: `${longColony}, no photo` })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

  const nav = await openWorkspaceNavigation(page)
  await nav.getByRole('link', { name: 'Cats', exact: true }).click()
  const cat = page.getByRole('link', { name: longCat, exact: true })
  await expect(cat).toBeVisible()
  await expect(cat).toContainText(longColony)
  await expect(cat.getByRole('img', { name: `${longCat}, no photo` })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
