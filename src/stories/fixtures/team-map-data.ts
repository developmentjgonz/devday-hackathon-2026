import type { ColonyMapData } from '@/components/ui/map/types'

// All names, counts, and positions are fictional. Never add real locations here.
export const teamMapData = {
  audience: 'team',
  colonies: [
    {
      id: 'demo-01',
      name: 'Canal colony',
      coordinates: [-80.249, 25.812],
      status: 'routine',
      catCount: 8,
    },
    {
      id: 'demo-02',
      name: 'Palm grove colony',
      coordinates: [-80.226, 25.797],
      status: 'needs-visit',
      catCount: 12,
    },
    {
      id: 'demo-03',
      name: 'Garden colony',
      coordinates: [-80.243, 25.771],
      status: 'urgent',
      catCount: 6,
    },
    {
      id: 'demo-04',
      name: 'West courtyard colony',
      coordinates: [-80.281, 25.787],
      status: 'routine',
      catCount: 9,
    },
  ],
} satisfies ColonyMapData
