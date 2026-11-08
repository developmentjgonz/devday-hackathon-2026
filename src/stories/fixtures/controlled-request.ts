/** Keep a Storybook request pending until a test releases it, with a fallback for previews. */
export function waitForStoryRequest(eventName: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      window.clearTimeout(timer)
      window.removeEventListener(eventName, finish)
      signal?.removeEventListener('abort', finish)
      resolve()
    }
    const timer = window.setTimeout(finish, 30000)
    window.addEventListener(eventName, finish, { once: true })
    signal?.addEventListener('abort', finish, { once: true })
    if (signal?.aborted) finish()
  })
}
