export async function statisticsLoader({ request }: { request: Request }) {
  const response = await fetch('/api/statistics', { credentials: 'same-origin', cache: 'no-store', signal: request.signal })
  // The workspace loader handles sign-in and account status redirects.
  if (response.status === 401 || response.status === 403) return null
  if (!response.ok) throw new Error('Statistics are unavailable. Try again.')
  return response.json()
}

export async function downloadStatistics(kind: 'summary' | 'cats', colonyId: string) {
  const query = new URLSearchParams({ kind, ...(colonyId ? { colonyId } : {}) })
  const response = await fetch(`/api/statistics/export?${query}`, { credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? 'The download failed. Try again.')
  }
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ?? `mews-${kind}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
