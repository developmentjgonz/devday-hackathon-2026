import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addressResults } from '../../src/lib/address-search.ts'

test('address results keep useful labels and valid point coordinates', () => {
  const results = addressResults({ features: [
    { properties: { name: 'Garden Center', housenumber: '701', street: 'Brickell Avenue', city: 'Miami', state: 'Florida', country: 'United States' }, geometry: { type: 'Point', coordinates: [-80.19, 25.77] } },
    { properties: { housenumber: '701', street: 'Brickell Avenue', city: 'Miami' }, geometry: { type: 'Point', coordinates: [-80.2, 25.8] } },
    { properties: { name: 'Bad point' }, geometry: { type: 'Point', coordinates: [181, 25] } },
    { properties: { name: 'Not a point' }, geometry: { type: 'Polygon', coordinates: [] } },
  ] })
  assert.deepEqual(results, [
    { label: 'Garden Center', detail: '701 Brickell Avenue, Miami, Florida, United States', coordinates: [-80.19, 25.77] },
    { label: '701 Brickell Avenue', detail: 'Miami', coordinates: [-80.2, 25.8] },
  ])
})

test('address search rejects malformed responses and limits the results', () => {
  assert.throws(() => addressResults({}))
  const features = Array.from({ length: 7 }, (_, index) => ({ properties: { name: `Place ${index}` }, geometry: { type: 'Point', coordinates: [0, index] } }))
  assert.equal(addressResults({ features }).length, 5)
  assert.deepEqual(addressResults({ features: [] }), [])
})
