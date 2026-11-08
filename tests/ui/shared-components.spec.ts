import { readdirSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { badgeStateVariants, buttonStateVariants, sharedStateCoverage } from '../../src/stories/fixtures/interaction-contracts'
import { appearance, expectFocusRing, fill, keyboardFocus, leavePointer, openStateStory } from './state-helpers'

test('every shared component has a state coverage entry', () => {
  const sources = readdirSync(new URL('../../src/components/ui/', import.meta.url), { recursive: true })
    .filter((path): path is string => typeof path === 'string' && path.endsWith('.tsx') && !path.endsWith('.stories.tsx'))
    .sort()
  expect(Object.keys(sharedStateCoverage).sort()).toEqual(sources)
})

for (const variant of buttonStateVariants) {
  test(`${variant} button: hover, focus, activation, disabled, and loading`, async ({ page }, info) => {
    await openStateStory(page, 'buttons', info.project.name === 'dark')
    const button = page.getByRole('button', { name: `${variant} action`, exact: true })
    await expect(button).toBeVisible()
    const idle = await appearance(button)
    await button.hover()
    await expect.poll(() => appearance(button)).not.toEqual(idle)
    await leavePointer(page)
    await expect.poll(() => appearance(button)).toEqual(idle)
    await expectFocusRing(page, button)
    await page.keyboard.press('Enter')
    await expect(page.getByLabel(`${variant} activations`, { exact: true })).toHaveText('1')
    await page.keyboard.press('Space')
    await expect(page.getByLabel(`${variant} activations`, { exact: true })).toHaveText('2')
    const link = page.getByRole('link', { name: `${variant} link`, exact: true })
    await expectFocusRing(page, link)
    await page.keyboard.press('Enter')
    await expect(page.getByLabel(`${variant} activations`, { exact: true })).toHaveText('3')
    await expect(page).toHaveURL(/#destination$/)
    for (const state of ['disabled', 'loading', 'disabled link', 'loading link']) {
      const disabled = page.getByRole(state.endsWith('link') ? 'link' : 'button', { name: `${variant} ${state}`, exact: true })
      await expect(disabled).toBeDisabled()
      if (state.startsWith('loading')) await expect(disabled).toHaveAttribute('aria-busy', 'true')
      // Physical pointer input must not change appearance or activate a disabled action.
      await disabled.scrollIntoViewIfNeeded()
      const before = await appearance(disabled)
      const box = await disabled.boundingBox()
      if (!box) throw new Error('Disabled control is missing')
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      expect(await appearance(disabled)).toEqual(before)
      await expect(page.getByLabel(`${variant} activations`, { exact: true })).toHaveText('3')
      if (state.endsWith('link')) expect(await disabled.evaluate((element) => (element as HTMLElement).tabIndex)).toBe(-1)
    }
  })
}

for (const label of ['Cat name', 'Care notes', 'Colony', 'Fresh water']) {
  test(`${label}: focus stays distinct from hover and invalid state`, async ({ page }, info) => {
    await openStateStory(page, 'fields', info.project.name === 'dark')
    for (const state of ['default', 'invalid']) {
      const field = label === 'Fresh water'
        ? page.getByRole('checkbox', { name: `${label} (${state})`, exact: true })
        : page.getByLabel(`${label} (${state})`, { exact: true })
      await expect(field).toBeVisible()
      await leavePointer(page)
      const idleFill = await fill(field)
      await field.hover()
      expect(await fill(field)).toBe(idleFill)
      await leavePointer(page)
      await expectFocusRing(page, field)
      expect(await fill(field)).toBe(idleFill)
      if (state === 'invalid') await expect(field).toHaveAttribute('aria-invalid', 'true')
      if (label === 'Fresh water') {
        await page.keyboard.press('Space')
        await expect(field).toBeChecked()
        await expect.poll(() => fill(field)).not.toBe(idleFill)
        const checked = await fill(field)
        await field.hover()
        expect(await fill(field)).toBe(checked)
        await page.getByText(`Fresh water (${state})`, { exact: true }).click()
        await expect(field).not.toBeChecked()
      } else if (label === 'Colony') {
        await field.selectOption('riverside')
        await expect(field).toHaveValue('riverside')
      } else {
        await field.fill('Miso')
        await expect(field).toHaveValue('Miso')
      }
    }
    const disabled = label === 'Fresh water'
      ? page.getByRole('checkbox', { name: `${label} (disabled)`, exact: true })
      : page.getByLabel(`${label} (disabled)`, { exact: true })
    await expect(disabled).toBeDisabled()
    // Tab must skip the disabled field, even after the last enabled field.
    for (let step = 0; step < 15; step++) {
      await page.keyboard.press('Tab')
      await expect(disabled).not.toBeFocused()
    }
  })
}

for (const group of ['Records', 'Reports']) {
  test(`${group}: selection persists through hover, press, and focus`, async ({ page }, info) => {
    await openStateStory(page, 'selection', info.project.name === 'dark')
    const section = page.getByRole('region', { name: group, exact: true })
    const selected = section.getByRole('button').nth(0)
    const other = section.getByRole('button').nth(1)
    const attribute = group === 'Records' ? 'aria-pressed' : 'aria-current'
    await expect(selected).toHaveAttribute(attribute, 'true')
    const selectedFill = await fill(selected)
    await selected.hover()
    expect(await fill(selected)).toBe(selectedFill)
    await page.mouse.down()
    expect(await fill(selected)).toBe(selectedFill)
    await page.mouse.up()
    await other.hover()
    expect(await fill(other)).not.toBe(selectedFill)
    await expect(selected).toHaveAttribute(attribute, 'true')
    await leavePointer(page)
    await expectFocusRing(page, selected)
    expect(await fill(selected)).toBe(selectedFill)
    await keyboardFocus(page, other)
    await page.keyboard.press('Enter')
    await expect(other).toHaveAttribute(attribute, 'true')
    await expect.poll(() => fill(other)).toBe(selectedFill)
    await expect.poll(() => fill(selected)).not.toBe(selectedFill)
    if (group === 'Reports') await expect(section.getByRole('button', { name: /Unavailable report/ })).toBeDisabled()
  })
}

test('selected table row retains its fill on hover and focus within', async ({ page }, info) => {
  await openStateStory(page, 'selection', info.project.name === 'dark')
  const section = page.getByRole('region', { name: 'Table', exact: true })
  const selected = section.getByRole('row').first()
  const other = section.getByRole('row').nth(1)
  const selectedFill = await fill(selected)
  await selected.hover()
  expect(await fill(selected)).toBe(selectedFill)
  await other.hover()
  expect(await fill(other)).not.toBe(selectedFill)
  await leavePointer(page)
  await expectFocusRing(page, selected.getByRole('button'))
  expect(await fill(selected)).toBe(selectedFill)
  await keyboardFocus(page, other.getByRole('button'))
  expect(await fill(other)).not.toBe(selectedFill)
  await page.keyboard.press('Enter')
  await expect.poll(() => fill(other)).toBe(selectedFill)
})

test('tabs keep a selected underline; hover is not selection', async ({ page }, info) => {
  await openStateStory(page, 'selection', info.project.name === 'dark')
  const current = page.getByRole('tab', { name: 'To review' })
  const other = page.getByRole('tab', { name: 'Processed' })
  const border = (target: typeof current) => target.evaluate((element) => getComputedStyle(element).borderBottomColor)
  const selectedBorder = await border(current)
  await other.hover()
  expect(await border(other)).not.toBe(selectedBorder)
  await expect(current).toHaveAttribute('aria-selected', 'true')
  await leavePointer(page)
  await expectFocusRing(page, current)
  expect(await border(current)).toBe(selectedBorder)
  await page.keyboard.press('ArrowRight')
  await expect(other).toBeFocused()
  await expect(other).toHaveAttribute('aria-selected', 'true')
  await expect.poll(() => border(other)).toBe(selectedBorder)
})

test('disclosure separates hover, keyboard focus, and open state', async ({ page }, info) => {
  await openStateStory(page, 'selection', info.project.name === 'dark')
  const summary = page.locator('summary')
  const idle = await appearance(summary)
  await summary.hover()
  await expect.poll(() => appearance(summary)).not.toEqual(idle)
  await leavePointer(page)
  await expectFocusRing(page, summary)
  await page.keyboard.press('Enter')
  await expect(page.locator('details')).toHaveAttribute('open', '')
  await page.keyboard.press('Space')
  await expect(page.locator('details')).not.toHaveAttribute('open')
})

test('links, rendered card, text, brand, and skip link retain visible keyboard focus', async ({ page }, info) => {
  await openStateStory(page, 'links', info.project.name === 'dark')
  for (const name of ['Mews home', 'About Mews', 'Care details', 'Current page', 'Other page', 'Current workspace page', 'Skip to content', 'Open colony card', 'Care text link']) {
    const link = page.getByRole('link', { name, exact: true })
    await expectFocusRing(page, link)
    if (name === 'Skip to content') {
      await expect(link).toBeInViewport()
      await page.keyboard.press('Enter')
      await expect(page.locator('#destination')).toBeFocused()
    }
  }
})

test('current text and navigation links stay distinct from hover', async ({ page }, info) => {
  await openStateStory(page, 'links', info.project.name === 'dark')
  for (const [currentName, otherName] of [['Current page', 'About Mews'], ['Current workspace page', 'Other page']]) {
    const current = page.getByRole('link', { name: currentName, exact: true })
    const other = page.getByRole('link', { name: otherName, exact: true })
    const selected = await appearance(current)
    await current.hover()
    expect(await appearance(current)).toEqual(selected)
    await other.hover()
    expect(await appearance(other)).not.toEqual(selected)
    await expect(current).toHaveAttribute('aria-current', 'page')
  }
})

for (const variant of badgeStateVariants) {
  test(`${variant} badge: links have focus; static badges stay passive`, async ({ page }, info) => {
    await openStateStory(page, 'links', info.project.name === 'dark')
    const section = page.getByRole('region', { name: `${variant} badge`, exact: true })
    const link = section.getByRole('link')
    const plain = section.getByText('Care status', { exact: true })
    const staticAppearance = await appearance(plain)
    await plain.hover()
    expect(await appearance(plain)).toEqual(staticAppearance)
    expect(await plain.evaluate((element) => (element as HTMLElement).tabIndex)).toBe(-1)
    await leavePointer(page)
    const idle = await appearance(link)
    await link.hover()
    await expect.poll(() => appearance(link)).not.toEqual(idle)
    await leavePointer(page)
    await expectFocusRing(page, link)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#destination$/)
  })
}
