import type { ColonyMapData } from '@/components/ui/map/types'

// Authored area summaries. They are not derived from the team marker fixture.
export const publicMapData = {
  audience: 'public',
  areas: [
    {
      id: 'north-area',
      name: 'North service area',
      activity: 'high',
      colonyCountBand: '6–10',
      boundary: {
        type: 'Polygon',
        coordinates: [
          [
            [-80.26, 25.84],
            [-80.23, 25.855],
            [-80.2, 25.84],
            [-80.2, 25.805],
            [-80.23, 25.79],
            [-80.26, 25.805],
            [-80.26, 25.84],
          ],
        ],
      },
    },
    {
      id: 'central-area',
      name: 'Central service area',
      activity: 'medium',
      colonyCountBand: '3–5',
      boundary: {
        type: 'Polygon',
        coordinates: [
          [
            [-80.26, 25.775],
            [-80.23, 25.79],
            [-80.2, 25.775],
            [-80.2, 25.74],
            [-80.23, 25.725],
            [-80.26, 25.74],
            [-80.26, 25.775],
          ],
        ],
      },
    },
    {
      id: 'west-area',
      name: 'West service area',
      activity: 'low',
      colonyCountBand: '3–5',
      boundary: {
        type: 'Polygon',
        coordinates: [
          [
            [-80.32, 25.8075],
            [-80.29, 25.8225],
            [-80.26, 25.8075],
            [-80.26, 25.7725],
            [-80.29, 25.7575],
            [-80.32, 25.7725],
            [-80.32, 25.8075],
          ],
        ],
      },
    },
  ],
} satisfies ColonyMapData
