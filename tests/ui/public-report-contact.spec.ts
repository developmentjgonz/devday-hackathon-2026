import { expect, test } from '@playwright/test'

test('the public form shows enabled contact options and their direct links', async ({ page }) => {
  await page.route('**/api/public-reports/contact', (route) => route.fulfill({ json: { phone: '+1 (305) 555-0123', email: 'reports@example.test' } }))
  await page.goto('/iframe.html?id=pages-public-report--form&viewMode=story')
  await expect(page.getByRole('heading', { name: 'Other ways to contact the team' })).toBeVisible()
  await expect(page.getByRole('link', { name: '+1 (305) 555-0123' })).toHaveAttribute('href', 'tel:+13055550123')
  await expect(page.getByRole('link', { name: 'reports@example.test' })).toHaveAttribute('href', 'mailto:reports%40example.test')
})

test('the public form hides contact options when none are enabled', async ({ page }) => {
  await page.route('**/api/public-reports/contact', (route) => route.fulfill({ json: { phone: null, email: null } }))
  await page.goto('/iframe.html?id=pages-public-report--form&viewMode=story')
  await expect(page.getByRole('heading', { name: 'Tell us about a cat' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Other ways to contact the team' })).toHaveCount(0)
})

test('the standard form remains available when chat is enabled', async ({ page }) => {
  await page.route('**/api/public-reports/contact', (route) => route.fulfill({ json: { phone: null, email: null, chatAvailable: true } }))
  await page.goto('/iframe.html?id=pages-public-report--form&viewMode=story')
  await expect(page.getByLabel('Where did you see the cat?')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Chat with Mews instead' })).toHaveAttribute('href', '/report/chat')
})

test('the public form can retry loading contact options', async ({ page }) => {
  let requests = 0
  await page.route('**/api/public-reports/contact', (route) => {
    requests++
    return requests === 1 ? route.fulfill({ status: 503 }) : route.fulfill({ json: { phone: null, email: 'reports@example.test' } })
  })
  await page.goto('/iframe.html?id=pages-public-report--form&viewMode=story')
  await expect(page.getByText('Contact options unavailable')).toBeVisible()
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('link', { name: 'reports@example.test' })).toBeVisible()
  await expect(page.getByText('Contact options unavailable')).toHaveCount(0)
})

const permission = 'I allow the care team to contact me about this report using the details I provide.'
const formStory = '/iframe.html?id=pages-public-report--form&viewMode=story'

test('email-only contact requires permission and survives a failed form submission', async ({ page }) => {
  await page.route('**/api/public-reports/contact', (route) => route.fulfill({ json: { phone: null, email: null } }))
  const submissions: Array<{ key: string; data: Record<string, unknown> }> = []
  await page.route('**/api/public-reports', (route) => {
    submissions.push({ key: route.request().headers()['idempotency-key'], data: route.request().postDataJSON() })
    return route.fulfill(submissions.length === 1 ? { status: 503, json: { error: 'Please try again.' } } : { status: 201, json: { submitted: true } })
  })
  await page.goto(formStory)
  await expect(page.getByRole('checkbox', { name: permission })).not.toBeChecked()
  await expect(page.getByLabel('Phone number (recommended)', { exact: true })).toHaveCount(0)
  await page.getByLabel('Where did you see the cat?').fill('Oak Street')
  await page.getByLabel('What did you notice?').fill('A gray cat by the gate.')
  await page.getByRole('checkbox', { name: permission }).check()
  await page.getByRole('button', { name: 'Send report', exact: true }).click()
  await expect(page.getByText('Enter a phone number or email address, or turn off follow-up contact.')).toBeVisible()
  expect(submissions).toHaveLength(0)
  await page.getByLabel('Email address', { exact: false }).fill('sender@example.test')
  await page.getByRole('button', { name: 'Send report', exact: true }).click()
  await expect(page.getByText('Please try again.')).toBeVisible()
  await expect(page.getByLabel('Email address', { exact: false })).toHaveValue('sender@example.test')
  await expect(page.getByRole('checkbox', { name: permission })).toBeChecked()
  await page.getByRole('button', { name: 'Send report', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Thank you for helping cats.' })).toBeVisible()
  expect(submissions[0].data.contact).toEqual({ email: 'sender@example.test', consent: true })
  expect(submissions[0]).toEqual(submissions[1])
  await page.getByRole('button', { name: 'Send another report' }).click()
  await expect(page.getByRole('checkbox', { name: permission })).not.toBeChecked()
})

test('turning off permission sends an anonymous report without entered contact details', async ({ page }) => {
  await page.route('**/api/public-reports/contact', (route) => route.fulfill({ json: { phone: null, email: null } }))
  let data: Record<string, unknown> = {}
  await page.route('**/api/public-reports', (route) => { data = route.request().postDataJSON(); return route.fulfill({ status: 201, json: { submitted: true } }) })
  await page.goto(formStory)
  await page.getByLabel('Where did you see the cat?').fill('Oak Street')
  await page.getByLabel('What did you notice?').fill('A gray cat by the gate.')
  await page.getByRole('checkbox', { name: permission }).check()
  await page.getByLabel('Phone number (recommended)', { exact: true }).fill('+1 (305) 555-0123')
  await page.getByRole('checkbox', { name: permission }).uncheck()
  await page.getByRole('button', { name: 'Send report', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Thank you for helping cats.' })).toBeVisible()
  expect(data).not.toHaveProperty('contact')
})

test('chat contact stays outside AI requests and survives report corrections and form fallback', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/api/public-reports/contact', (route) => route.fulfill({ json: { phone: null, email: null, chatAvailable: true } }))
  const aiRequests: unknown[] = []
  await page.route('**/api/public-reports/chat', (route) => {
    aiRequests.push(route.request().postDataJSON())
    return route.fulfill({ json: { ready: true, reply: 'Please check your report.', location: 'Oak Street', details: 'A gray cat by the gate.', urgent: false, locations: [] } })
  })
  let data: Record<string, unknown> = {}
  await page.route('**/api/public-reports', (route) => { data = route.request().postDataJSON(); return route.fulfill({ status: 201, json: { submitted: true } }) })
  await page.goto('/iframe.html?id=pages-public-report--chat&viewMode=story')
  await page.getByLabel('Your message').fill('A gray cat on Oak Street.')
  await page.getByRole('button', { name: 'Send message' }).click()
  await page.getByRole('checkbox', { name: permission }).check()
  await page.getByLabel('Phone number (recommended)', { exact: true }).fill('+1 (305) 555-0123')
  await page.getByLabel('Your message').fill('The cat is by the gate.')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByLabel('Phone number (recommended)', { exact: true })).toHaveValue('+1 (305) 555-0123')
  expect(JSON.stringify(aiRequests)).not.toContain('555-0123')
  await page.getByRole('button', { name: 'Use the report form instead' }).click()
  await expect(page.getByRole('checkbox', { name: permission })).toBeChecked()
  await expect(page.getByLabel('Phone number (recommended)', { exact: true })).toHaveValue('+1 (305) 555-0123')
  await page.getByRole('button', { name: 'Send report', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Thank you for helping cats.' })).toBeVisible()
  expect(data.contact).toEqual({ phone: '+1 (305) 555-0123', consent: true })
})

test('chat validates a phone number before sending with follow-up permission', async ({ page }) => {
  await page.route('**/api/public-reports/contact', (route) => route.fulfill({ json: { phone: null, email: null, chatAvailable: true } }))
  await page.route('**/api/public-reports/chat', (route) => route.fulfill({ json: { ready: true, reply: 'Please check your report.', location: 'Oak Street', details: 'A gray cat by the gate.', urgent: false, locations: [] } }))
  const submissions: Record<string, unknown>[] = []
  await page.route('**/api/public-reports', (route) => { submissions.push(route.request().postDataJSON()); return route.fulfill({ status: 201, json: { submitted: true } }) })
  await page.goto('/iframe.html?id=pages-public-report--chat&viewMode=story')
  await page.getByLabel('Your message').fill('A gray cat on Oak Street.')
  await page.getByRole('button', { name: 'Send message' }).click()
  await page.getByRole('checkbox', { name: permission }).check()
  await page.getByLabel('Phone number (recommended)', { exact: true }).fill('123')
  await page.getByRole('button', { name: 'Yes, send report', exact: true }).click()
  await expect(page.getByText('Enter a phone number with 7 to 15 digits.')).toBeVisible()
  expect(submissions).toHaveLength(0)
  await page.getByLabel('Phone number (recommended)', { exact: true }).fill('+1 (305) 555-0123')
  await page.getByRole('button', { name: 'Yes, send report', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Start another report' })).toBeVisible()
  expect(submissions[0].contact).toEqual({ phone: '+1 (305) 555-0123', consent: true })
  await page.getByRole('button', { name: 'Start another report' }).click()
  await page.getByLabel('Your message').fill('Another gray cat on Oak Street.')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByRole('checkbox', { name: permission })).not.toBeChecked()
})

test('the private report review shows direct follow-up links and permission', async ({ page }) => {
  await page.goto('/iframe.html?id=pages-reports--community-report-with-contact&viewMode=story')
  const contact = page.getByRole('region', { name: 'Follow-up contact' })
  await expect(contact).toContainText('The sender allowed the care team to contact them about this report.')
  await expect(contact.getByRole('link', { name: '+1 (305) 555-0123' })).toHaveAttribute('href', 'tel:+13055550123')
  await expect(contact.getByRole('link', { name: 'sender@example.test' })).toHaveAttribute('href', 'mailto:sender%40example.test')
  await expect(page.getByText('The sender cannot receive questions.')).toHaveCount(0)
  await expect(page.getByText('Submitted anonymously', { exact: true })).toHaveCount(0)
})
