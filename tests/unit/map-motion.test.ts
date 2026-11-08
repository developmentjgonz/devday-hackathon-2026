import { test } from 'node:test'
import assert from 'node:assert/strict'
import { moveMapToSelection } from '../../src/components/ui/map/motion.ts'

const settings = {
  pointer: true,
  visible: true,
  reducedMotion: false,
  duration: '200ms',
  easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
}

function camera() {
  const moves: { kind: string; options: { center: [number, number]; duration?: number; easing?: (value: number) => number } }[] = []
  return {
    moves,
    easeTo: (options: { center: [number, number]; duration: number; easing: (value: number) => number }) => { moves.push({ kind: 'ease', options }) },
    jumpTo: (options: { center: [number, number] }) => { moves.push({ kind: 'jump', options }) },
  }
}

test('a visible pointer selection uses the shared duration and curve', () => {
  const map = camera()
  moveMapToSelection(map, [-80.2, 25.8], settings)
  assert.equal(map.moves[0].kind, 'ease')
  assert.deepEqual(map.moves[0].options.center, [-80.2, 25.8])
  assert.equal(map.moves[0].options.duration, 200)
  assert.ok(map.moves[0].options.easing!(0.5) > 0.8)
  assert.equal(map.moves[0].options.easing!(1), 1)
})

for (const [name, change] of [
  ['keyboard selection', { pointer: false }],
  ['reduced motion', { reducedMotion: true }],
  ['an offscreen map', { visible: false }],
  ['invalid motion tokens', { easing: 'invalid' }],
  ['an incomplete easing curve', { easing: 'cubic-bezier(, 1, 0.32, 1)' }],
] as const) {
  test(`${name} uses an immediate change`, () => {
    const map = camera()
    moveMapToSelection(map, [-80.2, 25.8], { ...settings, ...change })
    assert.deepEqual(map.moves, [{ kind: 'jump', options: { center: [-80.2, 25.8] } }])
  })
}
