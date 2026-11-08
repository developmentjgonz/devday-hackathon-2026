import { useEffect, useState } from 'react'
import type { PublicContent } from '../../../shared/types/public'

type ContentState = { content: PublicContent | null; state: 'loading' | 'ready' | 'error' }
export function usePublicContent(initial?: PublicContent) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<ContentState>(() => initial ? { content: initial, state: 'ready' } : { content: null, state: 'loading' })
  useEffect(() => {
    if (initial) return
    const controller = new AbortController()
    setResult({ content: null, state: 'loading' })
    fetch('/api/public-content', { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error('Public content is unavailable')
      return response.json() as Promise<PublicContent>
    }).then((content) => setResult({ content, state: 'ready' })).catch(() => { if (!controller.signal.aborted) setResult({ content: null, state: 'error' }) })
    return () => controller.abort()
  }, [initial, attempt])
  return { ...result, retry: () => setAttempt((value) => value + 1) }
}
