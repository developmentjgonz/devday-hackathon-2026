import type { Page } from '@playwright/test'

export async function openReportFilters(page: Page) {
  const trigger = page.getByRole('button', { name: /^Filters(?: \(\d+\))?$/ })
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click()
}

export async function selectReportFilter(page: Page, label: 'status' | 'colony', value: string) {
  await openReportFilters(page)
  await page.getByRole('combobox', { name: `Filter by ${label}`, exact: true }).selectOption(value)
  await page.keyboard.press('Escape')
}
