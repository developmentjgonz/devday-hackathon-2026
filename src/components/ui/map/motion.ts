import unitBezier from '@mapbox/unitbezier'

export type MapSelection = { id: string; pointer: boolean }

type Camera = {
  easeTo: (options: { center: [number, number]; duration: number; easing: (value: number) => number }) => unknown
  jumpTo: (options: { center: [number, number] }) => unknown
}

type MotionSettings = {
  pointer: boolean
  visible: boolean
  reducedMotion: boolean
  duration: string
  easing: string
}

function timing(settings: MotionSettings) {
  const duration = /^(\d*\.?\d+)(ms|s)$/.exec(settings.duration.trim())
  const curve = /^cubic-bezier\(([^)]+)\)$/.exec(settings.easing.trim())
  if (!duration || !curve) return null
  const values = curve[1].split(',').map((point) => point.trim())
  if (values.length !== 4 || values.some((point) => point === '')) return null
  const points = values.map(Number)
  if (points.some((point) => !Number.isFinite(point))) return null
  const [x1, y1, x2, y2] = points as [number, number, number, number]
  const milliseconds = Number(duration[1]) * (duration[2] === 's' ? 1000 : 1)
  if (milliseconds <= 0 || x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return null
  return { duration: milliseconds, easing: unitBezier(x1, y1, x2, y2) }
}

/** Keep non-pointer and reduced-motion selections immediate. */
export function moveMapToSelection(camera: Camera, center: [number, number], settings: MotionSettings) {
  const motion = settings.pointer && settings.visible && !settings.reducedMotion ? timing(settings) : null
  if (motion) camera.easeTo({ center, ...motion })
  else camera.jumpTo({ center })
}
