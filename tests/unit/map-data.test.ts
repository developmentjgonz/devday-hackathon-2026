import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMapSources } from '../../src/components/ui/map/data.ts'
import { publicMapData } from '../../src/stories/fixtures/public-map-data.ts'
import { teamMapData } from '../../src/stories/fixtures/team-map-data.ts'

test('public map sources discard extra colony and contact fields', () => {
  const input = {
    ...publicMapData,
    colonies: [
      { coordinates: [-80.123456789, 25.987654321], name: 'PRIVATE_SENTINEL' },
    ],
    areas: publicMapData.areas.map((area) => ({
      ...area,
      feederContact: 'PRIVATE_SENTINEL',
      colonyCoordinates: [-80.123456789, 25.987654321],
    })),
  }
  const sources = createMapSources(input)
  assert.deepEqual(sources.colonies.features, [])
  assert.equal(sources.areas.features.length, publicMapData.areas.length)
  assert.equal(sources.heat.features.length, publicMapData.areas.length)
  assert.equal(JSON.stringify(sources).includes('PRIVATE_SENTINEL'), false)
  assert.equal(JSON.stringify(sources).includes('-80.123456789'), false)
  for (const feature of sources.areas.features)
    assert.deepEqual(Object.keys(feature.properties ?? {}).sort(), [
      'activity',
      'id',
    ])
})

test('team sources contain the fictional positions and keep public sources empty', () => {
  const sources = createMapSources(teamMapData)
  assert.deepEqual(sources.areas.features, [])
  assert.deepEqual(sources.heat.features, [])
  assert.deepEqual(
    sources.colonies.features.map((feature) => feature.geometry.coordinates),
    teamMapData.colonies.map((colony) => colony.coordinates),
  )
})

test('new data changes the rendered care status without mutating the previous snapshot', () => {
  const before = createMapSources(teamMapData)
  const after = createMapSources({
    ...teamMapData,
    colonies: teamMapData.colonies.map((colony, index) =>
      index === 0 ? { ...colony, status: 'needs-visit' } : colony,
    ),
  })
  assert.equal(before.colonies.features[0].properties?.status, 'routine')
  assert.equal(after.colonies.features[0].properties?.status, 'needs-visit')
})
