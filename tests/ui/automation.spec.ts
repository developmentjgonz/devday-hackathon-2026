import { expect, test } from '@playwright/test'

const story = (name: string) => `/iframe.html?id=pages-automation--${name}&viewMode=story`

test('human review supports approval and rejection with activity records', async ({ page }) => {
  await page.goto(story('human-review'))
  await expect(page.getByRole('heading', { name: 'Requires human review (2)' })).toBeVisible()
  await page.getByRole('button', { name: 'Approve changes', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Requires human review (1)' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Approved: Merge Riverside Cats into Riverside' })).toBeVisible()
  await page.getByRole('button', { name: 'Reject', exact: true }).click()
  await expect(page.getByText('No changes need review', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Rejected: Review possible injury near the feeding station' })).toBeVisible()
})

test('review controls appear only when enabled and the page fits a phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto(story('automatic'))
  await expect(page.getByRole('heading', { name: 'Activity', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Requires human review/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Approve changes' })).toHaveCount(0)
  await expect(page.getByText('Supported changes are applied automatically.', { exact: false })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.goto(story('human-review'))
  await expect(page.getByRole('heading', { name: 'Requires human review (2)' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('paused autopilot and members cannot access automation controls', async ({ page }) => {
  await page.goto(story('paused'))
  await expect(page.getByText('Autopilot is paused', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open AI setup' })).toHaveAttribute('href', '/app/configuration/ai')
  await expect(page.getByRole('button', { name: 'Run now' })).toHaveCount(0)
  await page.goto(story('member-access'))
  await expect(page.getByText('Administrator access required')).toBeVisible()
})

test('AI setup shows optional feature and review switches only with autopilot on', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-configuration--saved-key&viewMode=story')
  const master = page.getByRole('switch', { name: 'Enable autopilot', exact: true })
  const review = page.getByRole('switch', { name: 'Require human review', exact: true })
  await expect(master).not.toBeChecked()
  await expect(review).toHaveCount(0)
  await master.click()
  await expect(review).toBeChecked()
  await review.click()
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled()
  await expect(review).not.toBeChecked()
  await master.click()
  await expect(review).toHaveCount(0)
})
