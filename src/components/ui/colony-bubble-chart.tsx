import { Cat as CatIcon, Minus, Plus } from 'lucide-react'
import { memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router'
import type { Cat, Colony } from '../../../shared/types/directory'
import { Button } from './button'
import { EmptyState } from './empty-state'
import { RecordAvatar } from './record-avatar'
import { TextLink } from './text-link'
import { createTooltipHandle, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'
import { Heading, Text } from './typography'
import { catAge } from '@/lib/cat-age'
import './colony-bubble-chart.css'

const colors = [
  'border-[color-mix(in_srgb,var(--chart-2)_35%,var(--border))] bg-[color-mix(in_srgb,var(--chart-2)_18%,var(--card))]',
  'border-[color-mix(in_srgb,var(--chart-1)_35%,var(--border))] bg-[color-mix(in_srgb,var(--chart-1)_17%,var(--card))]',
  'border-[color-mix(in_srgb,var(--chart-3)_30%,var(--border))] bg-[color-mix(in_srgb,var(--chart-3)_14%,var(--card))]',
  'border-[color-mix(in_srgb,var(--chart-4)_30%,var(--border))] bg-[color-mix(in_srgb,var(--chart-4)_14%,var(--card))]',
]

type Point = { x: number; y: number }
type Group = { colony: Colony; members: Cat[]; points: Point[]; diameter: number }
type PlacedGroup = Group & Point
type Scene = { groups: PlacedGroup[]; width: number; height: number }

// Lay out the world once per viewport size, so zooming never rearranges colonies.
function layoutGroups(groups: Group[], width: number, height: number): Scene {
  const gap = 32
  const padding = 32
  const area = groups.reduce((sum, group) => sum + (group.diameter + gap) * (group.diameter + 112), 0)
  const aspect = Math.max(0.6, Math.min(2.5, width / height))
  const targetWidth = Math.max(...groups.map((group) => group.diameter), Math.sqrt(area * aspect))
  const rows: { groups: Group[]; width: number; height: number }[] = []
  let row: { groups: Group[]; width: number; height: number } = { groups: [], width: 0, height: 0 }
  for (const group of groups) {
    if (row.groups.length && row.width + gap + group.diameter > targetWidth) {
      rows.push(row)
      row = { groups: [], width: 0, height: 0 }
    }
    row.width += (row.groups.length ? gap : 0) + group.diameter
    row.height = Math.max(row.height, group.diameter + 80)
    row.groups.push(group)
  }
  if (row.groups.length) rows.push(row)
  const sceneWidth = Math.max(0, ...rows.map((item) => item.width)) + padding * 2
  let y = padding
  const placed: PlacedGroup[] = []
  for (const current of rows) {
    let x = (sceneWidth - current.width) / 2
    for (const group of current.groups) {
      placed.push({ ...group, x, y: y + (current.height - 80 - group.diameter) / 2 })
      x += group.diameter + gap
    }
    y += current.height + gap
  }
  return { groups: placed, width: sceneWidth, height: Math.max(1, y - gap + padding) }
}

// Keep every cat at a touch-friendly size. Larger colonies grow to fit them.
function catPositions(count: number): { points: Point[]; diameter: number } {
  if (!count) return { points: [], diameter: 190 }
  if (count === 1) return { points: [{ x: 0, y: 0 }], diameter: 198 }
  const points: Point[] = []
  let outerRadius = 0
  // A single ring is compact for small groups; concentric rings fit larger ones.
  const singleRadius = 68 / (2 * Math.sin(Math.PI / count))
  let rings = 0
  let capacity = 1
  while (capacity < count) { rings++; capacity += rings * 6 }
  if (singleRadius <= rings * 68) {
    outerRadius = singleRadius
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count
      points.push({ x: Math.cos(angle) * outerRadius, y: Math.sin(angle) * outerRadius })
    }
  } else {
    points.push({ x: 0, y: 0 })
    let remaining = count - 1
    for (let ring = 1; remaining > 0; ring++) {
      const inRing = Math.min(remaining, ring * 6)
      const radius = ring * 68
      outerRadius = radius
      for (let i = 0; i < inRing; i++) {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / inRing
        points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius })
      }
      remaining -= inRing
    }
  }
  return { points, diameter: Math.ceil(Math.max(192 + Math.sqrt(count) * 7, (outerRadius + 43) * 2)) }
}

const BubbleScene = memo(function BubbleScene({ scene, tooltip, tooltipId }: {
  scene: Scene
  tooltip: ReturnType<typeof createTooltipHandle<{ cat: Cat; colony: Colony }>>
  tooltipId: string
}) {
  return <ul className="absolute m-0 list-none p-0" style={{ width: scene.width, height: scene.height }}>
    {scene.groups.map(({ colony, members, points, diameter, x, y }, index) => <li key={colony.id} className="absolute text-center" style={{ width: diameter, left: x, top: y }}>
      <div className="relative aspect-square">
        <div aria-hidden="true" className={`mews-bubble-drift pointer-events-none absolute inset-0 rounded-full border bg-[radial-gradient(circle_at_28%_22%,rgba(255,255,255,0.55),transparent_52%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_12px_30px_-24px_rgba(36,35,31,0.45)] ${colors[index % colors.length]}`} style={{ animationDelay: `${-(index % 8)}s` }} />
        {members.length ? members.map((cat, catIndex) => <div key={cat.id} className="absolute" style={{ left: `calc(50% + ${points[catIndex]!.x}px)`, top: `calc(50% + ${points[catIndex]!.y}px)`, transform: 'translate(-50%, -50%)' }}>
          <TooltipTrigger handle={tooltip} payload={{ cat, colony }} aria-describedby={tooltipId} render={<Button variant="bubble" size="bubble" render={<Link to={`/app/cats/${encodeURIComponent(cat.id)}`} />} aria-label={`Open cat: ${cat.name}, ${colony.name}`} />}>
            <RecordAvatar name={cat.name} kind="cat" src={cat.photoUrl} />
          </TooltipTrigger>
        </div>) : <EmptyState icon={<CatIcon />} title="No cats yet" />}
      </div>
      <Heading level={3} size="card" className="mt-2 line-clamp-2 wrap-anywhere"><TextLink render={<Link to={`/app/colonies/${encodeURIComponent(colony.id)}`} />}>{colony.name}</TextLink></Heading>
      <Text size="caption" tone="muted">{members.length} {members.length === 1 ? 'cat' : 'cats'}</Text>
    </li>)}
  </ul>
})

/** A circle for each colony, containing one linked bubble for every cat. */
export function ColonyBubbleChart({ colonies, cats }: { colonies: Colony[]; cats: Cat[] }) {
  const [tooltip] = useState(() => createTooltipHandle<{ cat: Cat; colony: Colony }>())
  const tooltipId = useId()
  const canvas = useRef<HTMLDivElement>(null)
  const world = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState({ width: 900, height: 480 })
  const [manualZoom, setManualZoom] = useState<number | null>(() => typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : null)
  const groups = useMemo(() => {
    const catsByColony = new Map<string, Cat[]>()
    for (const cat of cats) {
      const group = catsByColony.get(cat.colonyId) ?? []
      group.push(cat)
      catsByColony.set(cat.colonyId, group)
    }
    return [...colonies].sort((a, b) => a.name.localeCompare(b.name)).map((colony): Group => {
      const members = [...(catsByColony.get(colony.id) ?? [])].sort((a, b) => a.name.localeCompare(b.name))
      return { colony, members, ...catPositions(members.length) }
    })
  }, [colonies, cats])
  useLayoutEffect(() => {
    const element = canvas.current
    if (!element) return
    const update = () => {
      const height = Math.max(320, Math.min(800, window.innerHeight - Math.max(0, element.getBoundingClientRect().top) - 32))
      const width = element.clientWidth
      setViewport((previous) => previous.width === width && previous.height === height ? previous : { width, height })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    window.addEventListener('resize', update)
    return () => { observer.disconnect(); window.removeEventListener('resize', update) }
  }, [])
  const scene = useMemo(() => layoutGroups(groups, viewport.width, viewport.height), [groups, viewport])
  const fitZoom = Math.min(1, viewport.width / scene.width, viewport.height / scene.height)
  const minZoom = Math.min(0.25, fitZoom)
  const zoom = manualZoom ?? fitZoom
  const offsetX = Math.max(0, (viewport.width - scene.width * zoom) / 2)
  const offsetY = Math.max(0, (viewport.height - scene.height * zoom) / 2)
  const rendered = useRef({ zoom, minZoom, offsetX, offsetY })
  const desiredZoom = useRef(zoom)
  const anchor = useRef<{ worldX: number; worldY: number; x: number; y: number } | null>(null)
  const pendingAnchor = useRef<{ worldX: number; worldY: number; x: number; y: number; zoom: number; offsetX: number; offsetY: number; width: number; height: number } | null>(null)
  const anchorFrame = useRef<number | null>(null)
  const drag = useRef<{ pointer: number; x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null)

  const applyAnchor = useCallback(() => {
    const element = canvas.current
    const surface = world.current
    const position = pendingAnchor.current
    if (!element || !surface || !position) return
    const bounds = surface.getBoundingClientRect()
    if (Math.abs(bounds.width - position.width) > 1 || Math.abs(bounds.height - position.height) > 1) return
    element.scrollLeft = position.worldX * position.zoom + position.offsetX - position.x
    element.scrollTop = position.worldY * position.zoom + position.offsetY - position.y
    pendingAnchor.current = null
  }, [])

  useLayoutEffect(() => {
    if (anchor.current) {
      pendingAnchor.current = { ...anchor.current, zoom, offsetX, offsetY, width: Math.max(viewport.width, scene.width * zoom), height: Math.max(viewport.height, scene.height * zoom) }
      anchor.current = null
      if (anchorFrame.current !== null) cancelAnimationFrame(anchorFrame.current)
      anchorFrame.current = requestAnimationFrame(() => {
        applyAnchor()
        anchorFrame.current = null
      })
    }
    rendered.current = { zoom, minZoom, offsetX, offsetY }
    desiredZoom.current = zoom
  }, [zoom, minZoom, offsetX, offsetY, scene.width, scene.height, viewport.width, viewport.height, applyAnchor])

  useEffect(() => {
    const observer = new ResizeObserver(applyAnchor)
    if (world.current) observer.observe(world.current)
    return () => { observer.disconnect(); if (anchorFrame.current !== null) cancelAnimationFrame(anchorFrame.current) }
  }, [applyAnchor])

  const zoomAt = useCallback((factor: number, x: number, y: number) => {
    const element = canvas.current
    if (!element) return false
    const next = Math.max(rendered.current.minZoom, Math.min(1.5, desiredZoom.current * factor))
    if (Math.abs(next - desiredZoom.current) < 0.00001) return false
    const current = rendered.current
    const pending = pendingAnchor.current
    const left = pending ? Math.max(0, Math.min(pending.width - element.clientWidth, pending.worldX * pending.zoom + pending.offsetX - pending.x)) : element.scrollLeft
    const top = pending ? Math.max(0, Math.min(pending.height - element.clientHeight, pending.worldY * pending.zoom + pending.offsetY - pending.y)) : element.scrollTop
    anchor.current = { worldX: (left + x - current.offsetX) / current.zoom, worldY: (top + y - current.offsetY) / current.zoom, x, y }
    desiredZoom.current = next
    setManualZoom(next)
    return true
  }, [])

  useEffect(() => {
    const element = canvas.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
      const delta = event.deltaY * (event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? element.clientHeight : 1)
      const rect = element.getBoundingClientRect()
      if (zoomAt(Math.exp(-delta * 0.0015), event.clientX - rect.left, event.clientY - rect.top)) event.preventDefault()
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  function changeZoom(factor: number) {
    const element = canvas.current
    if (element) zoomAt(factor, element.clientWidth / 2, element.clientHeight / 2)
  }
  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || event.button !== 0 || (event.target as Element).closest('a, button, [role="button"]')) return
    const element = event.currentTarget
    drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, scrollLeft: element.scrollLeft, scrollTop: element.scrollTop }
    element.dataset.dragging = 'true'
    element.setPointerCapture(event.pointerId)
  }
  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.pointer !== event.pointerId) return
    event.currentTarget.scrollLeft = drag.current.scrollLeft - (event.clientX - drag.current.x)
    event.currentTarget.scrollTop = drag.current.scrollTop - (event.clientY - drag.current.y)
  }
  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (drag.current?.pointer !== event.pointerId) return
    drag.current = null
    delete event.currentTarget.dataset.dragging
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  return <TooltipProvider delay={250} closeDelay={100}>
    <div className="flex flex-wrap items-center justify-end gap-2" role="group" aria-label="Bubble zoom">
      <Text render={<span />} size="caption" tone="muted" className="mr-auto hidden sm:inline">Scroll to zoom · Drag to move</Text>
      <Button variant="outline" size="icon" aria-label="Zoom out" disabled={zoom <= minZoom + 0.00001} onClick={() => changeZoom(1 / 1.4)}><Minus aria-hidden="true" /></Button>
      <Text render={<span />} size="caption" tone="muted" aria-live="polite">{Math.round(zoom * 100)}%</Text>
      <Button variant="outline" size="icon" aria-label="Zoom in" disabled={zoom >= 1.5} onClick={() => changeZoom(1.4)}><Plus aria-hidden="true" /></Button>
      <Button variant="outline" onClick={() => { anchor.current = null; pendingAnchor.current = null; if (anchorFrame.current !== null) cancelAnimationFrame(anchorFrame.current); anchorFrame.current = null; setManualZoom(null) }}>Fit all</Button>
    </div>
    <div ref={canvas} className="mews-bubble-viewport min-w-0 w-full max-w-full overflow-auto" style={{ height: viewport.height }} tabIndex={0} role="region" aria-label="Colony bubbles"
      onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}>
      <div ref={world} className="relative" style={{ width: Math.max(viewport.width, scene.width * zoom), height: Math.max(viewport.height, scene.height * zoom) }}>
        <div className="absolute origin-top-left" style={{ left: offsetX, top: offsetY, transform: `scale(${zoom})` }}>
          <BubbleScene scene={scene} tooltip={tooltip} tooltipId={tooltipId} />
        </div>
      </div>
  </div><Tooltip handle={tooltip}>{({ payload }) => <TooltipContent id={tooltipId}>{payload ? <div className="space-y-1">
    <Heading level={4} size="compact" className="wrap-anywhere">{payload.cat.name}</Heading>
    <Text size="caption" tone="muted" className="wrap-anywhere">{payload.colony.name}{payload.cat.birthDate ? ` · ${catAge(payload.cat.birthDate, Boolean(payload.cat.birthDateEstimated))}` : ''}</Text>
    {payload.cat.description ? <Text size="caption" className="line-clamp-3 whitespace-pre-wrap wrap-anywhere">{payload.cat.description}</Text> : null}
  </div> : null}</TooltipContent>}</Tooltip></TooltipProvider>
}
