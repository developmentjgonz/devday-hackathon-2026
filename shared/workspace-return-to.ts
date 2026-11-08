/** Accept only paths inside this application's protected workspace. */
export function workspaceReturnTo(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/') || /[\\\u0000-\u001f\u007f]/.test(value)) return '/app'
  try {
    const url = new URL(value, 'https://mews.invalid')
    if (url.origin !== 'https://mews.invalid' || (url.pathname !== '/app' && !url.pathname.startsWith('/app/'))) return '/app'
    return `${url.pathname}${url.search}${url.hash}`
  } catch { return '/app' }
}
