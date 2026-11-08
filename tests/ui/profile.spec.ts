import { expect, test } from '@playwright/test'

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')

for (const width of [320, 1440]) {
  test(`profile details and photo can be edited at ${width}px`, async ({ page }, info) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/iframe.html?id=pages-profile--profile&viewMode=story')
    await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), info.project.name === 'dark')
    await expect(page.getByRole('heading', { level: 1, name: 'Profile' })).toBeVisible({ timeout: 15_000 })
    const save = page.getByRole('button', { name: 'Save changes' })
    await expect(save).toBeDisabled()
    await page.getByLabel('Name', { exact: true }).fill('Maya Updated')
    await page.getByLabel('Email', { exact: true }).fill('maya.updated@mews.test')
    await page.getByLabel('Phone (optional)').fill('+1 202 555 0100')
    await page.getByLabel('Profile photo (optional)').setInputFiles({ name: 'profile.png', mimeType: 'image/png', buffer: png })
    await expect(page.getByRole('button', { name: 'Remove photo' })).toBeVisible()
    await save.click()
    await expect(save).toBeDisabled()
    if (width < 768) {
      await page.getByRole('button', { name: 'Open menu' }).click()
      await expect(page.getByRole('dialog', { name: 'Menu' }).getByText('Maya Updated')).toBeVisible()
      await page.getByRole('button', { name: 'Close menu' }).click()
    } else {
      await expect(page.getByRole('button', { name: 'Account options for Maya Updated' })).toBeVisible()
    }
    await expect(page.getByLabel('Email', { exact: true })).toHaveValue('maya.updated@mews.test')
    await page.getByRole('button', { name: 'Remove photo' }).click()
    await expect(save).toBeEnabled()
    await save.click()
    await expect(page.getByRole('button', { name: 'Remove photo' })).toHaveCount(0)
    if (width < 768) await page.getByRole('button', { name: 'Open menu' }).click()
    else await page.getByRole('button', { name: 'Account options for Maya Updated' }).click()
    await expect(page.getByRole('link', { name: 'Profile', exact: true })).toBeVisible()
    await page.getByRole('link', { name: 'Profile', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Profile' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(consoleErrors.filter((message) => message.includes('expected a native <button>'))).toEqual([])
  })
}

test('profile reports invalid photos and failed saves without losing edits', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-profile--save-error&viewMode=story')
  await page.getByLabel('Name', { exact: true }).fill('Edited name')
  await page.getByLabel('Profile photo (optional)').setInputFiles({ name: 'profile.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') })
  await expect(page.getByRole('alert')).toContainText('Choose a JPEG, PNG, or WebP image')
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  await page.getByRole('button', { name: 'Clear photo error' }).click()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('alert')).toContainText('Could not save your profile')
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Edited name')
})

test('user avatars show photos and fall back to initials when a photo fails', async ({ page }) => {
  await page.goto('/iframe.html?id=display-user-avatar--photo&viewMode=story')
  await expect(page.locator('img')).toBeVisible()
  await expect.poll(() => page.locator('img').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await page.goto('/iframe.html?id=display-user-avatar--unavailable-photo&viewMode=story')
  await expect(page.getByText('MR', { exact: true })).toBeVisible()
  await expect(page.locator('img')).toHaveCount(0)
})
