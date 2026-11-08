import { expect, test } from '@playwright/test'

function luminance(color: string) {
  const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

for (const field of [{ story: 'forms-input--default', label: 'Cat name' }, { story: 'forms-textarea--default', label: 'Visit notes' }]) {
  test(`${field.label} hints differ from entered text and remain readable`, async ({ page }, info) => {
    await page.goto(`/iframe.html?id=${field.story}&viewMode=story`)
    await page.evaluate((enabled) => document.documentElement.classList.toggle('dark', enabled), info.project.name === 'dark')
    const input = page.getByRole('textbox', { name: field.label, exact: true })
    await expect(input).toHaveValue('')
    const background = await input.evaluate(() => { const probe = document.createElement('div'); probe.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--card').trim(); return probe.style.backgroundColor })
    await expect(input).toHaveCSS('background-color', background)
    const colors = await input.evaluate((element) => ({ value: getComputedStyle(element).color, placeholder: getComputedStyle(element, '::placeholder').color, background: getComputedStyle(element).backgroundColor }))
    expect(colors.placeholder).not.toBe(colors.value)
    expect(contrast(colors.placeholder, colors.background)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(colors.placeholder, colors.background)).toBeLessThan(contrast(colors.value, colors.background))
    await input.focus()
    await expect(input).toHaveValue('')
    await input.fill('Pepper')
    await expect(input).toHaveValue('Pepper')
    await expect(input).toHaveCSS('color', colors.value)
  })
}
