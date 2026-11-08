import { expect, test } from '@playwright/test'

const story = (name: string) => `/iframe.html?id=pages-configuration--${name}&viewMode=story`

test.beforeEach(async ({ page }, info) => {
  await page.addInitScript((dark) => {
    window.addEventListener('DOMContentLoaded', () => document.documentElement.classList.toggle('dark', dark), { once: true })
  }, info.project.name === 'dark')
})

test('administrators can save contact details and manage a write-only key', async ({ page }) => {
  await page.goto(story('phone-and-email'))
  const navigation = page.getByRole('navigation', { name: 'Configuration sections' })
  await expect(page.getByText('Calls and texts are not connected.')).toBeVisible()
  await expect(page.getByText('Email is not connected.')).toBeVisible()
  await page.getByLabel('Phone number').fill('+1 (305) 555-0123')
  await page.getByLabel('Inbound email').fill('REPORTS@example.test')
  await navigation.getByRole('link', { name: 'AI analysis' }).click()
  await navigation.getByRole('link', { name: 'Phone & email' }).click()
  await expect(page.getByLabel('Phone number')).toHaveValue('+1 (305) 555-0123')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByLabel('Inbound email')).toHaveValue('reports@example.test')
  await navigation.getByRole('link', { name: 'AI analysis' }).click()
  await page.getByLabel('OpenAI model').fill('example-model')
  const key = page.getByLabel('OpenAI API key')
  await key.fill('fictional-test-key')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(key).toHaveValue('')
  await expect(page.getByText('A key is saved. Enter a new key to replace it.')).toBeVisible()
  await page.getByRole('button', { name: 'Remove key' }).click()
  await expect(page.getByText('No API key is saved.')).toBeVisible()
})

test('configuration works on a phone and is restricted to administrators', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto(story('member-access'))
  await expect(page.getByText('Administrator access required')).toBeVisible()
  await expect(page.getByLabel('Phone number')).toHaveCount(0)
  await page.goto(story('phone-and-email'))
  const navigation = page.getByRole('navigation', { name: 'Configuration sections' })
  await navigation.getByRole('link', { name: 'Public reporting' }).click()
  await expect(page.getByText('There is no public report link to share.')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
