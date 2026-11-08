export function detailBackgroundKey(state: unknown): string | null {
  if (!state || typeof state !== 'object' || !('detailBackgroundKey' in state)) return null
  return typeof state.detailBackgroundKey === 'string' ? state.detailBackgroundKey : null
}
