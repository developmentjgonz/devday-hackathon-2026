import type { Cat, Colony } from '../shared/types/directory.ts'

// Fictional records for local development and Storybook. The first three
// colonies and cats are supplied by seeds/local.sql and inboxScenarioData.
// Approximate neighborhood centers from the City of Miami's neighborhood map.
// These locations do not represent real colonies.
const colonyLocations: Array<{ name: string; coordinates: [number, number] }> = [
  { name: 'Allapattah', coordinates: [-80.2225, 25.7966] },
  { name: 'Brickell', coordinates: [-80.1935, 25.7655] },
  { name: 'Buena Vista', coordinates: [-80.2029, 25.8166] },
  { name: 'Citrus Grove', coordinates: [-80.2309, 25.7725] },
  { name: 'Civic Center', coordinates: [-80.2148, 25.7905] },
  { name: 'Coconut Grove', coordinates: [-80.2559, 25.7180] },
  { name: 'Coral Gate', coordinates: [-80.2507, 25.7536] },
  { name: 'Design District', coordinates: [-80.1929, 25.8131] },
  { name: 'Downtown Miami', coordinates: [-80.1910, 25.7743] },
  { name: 'Edgewater', coordinates: [-80.1893, 25.8011] },
  { name: 'Flagami', coordinates: [-80.2844, 25.7704] },
  { name: 'Liberty City', coordinates: [-80.2212, 25.8356] },
  { name: 'Little Haiti', coordinates: [-80.1928, 25.8286] },
  { name: 'Little Havana', coordinates: [-80.2083, 25.7703] },
  { name: 'Little River', coordinates: [-80.1991, 25.8442] },
  { name: 'Midtown', coordinates: [-80.1934, 25.8080] },
  { name: 'Morningside', coordinates: [-80.1831, 25.8264] },
  { name: 'Overtown', coordinates: [-80.1991, 25.7841] },
  { name: 'Shenandoah', coordinates: [-80.2265, 25.7544] },
  { name: 'Silver Bluff', coordinates: [-80.2309, 25.7465] },
  { name: 'West Grove', coordinates: [-80.2516, 25.7277] },
  { name: 'Wynwood', coordinates: [-80.1959, 25.7991] },
]
const counts = [3, 6, 8, 11, 5, 9, 12, 4, 7, 10, 6, 8, 11, 13, 5, 9, 10, 7, 12, 4, 8, 11, 6, 8, 7]
const names = [
  'Luna', 'Milo', 'Cleo', 'Bean', 'Mochi', 'Poppy', 'Sunny', 'Maple', 'Pip', 'Nori',
  'Jasper', 'Willow', 'Biscuit', 'Clover', 'Otis', 'Ruby', 'Toby', 'Hazel', 'Ginger', 'Theo',
  'Daisy', 'Minnie', 'Benny', 'Freya', 'Sage', 'Waffles', 'Remy', 'Juno', 'Noodle', 'Peaches',
  'Pumpkin', 'Indigo', 'Suki', 'Fig', 'Tilly', 'Juniper', 'Ollie', 'Rosie', 'Coco', 'Louie',
  'Mabel', 'Scout', 'Mango', 'Nova', 'Penny', 'Felix', 'Ivy', 'Winnie', 'Rory', 'Dottie',
]
const suffixes = ['', ' Belle', ' Blue', ' Moon']
const descriptions = [
  'Orange tabby with a pale chin. Often arrives early for meals.',
  'Black coat and golden eyes. Likes to watch from a quiet spot.',
  'White coat and pale ears. Usually stays near the shelter.',
  'Calico coat and white chest. Familiar with the care team.',
  'Gray tabby with green eyes. Enjoys a little space at feeding time.',
  'Black and white coat. Often seen with a friend.',
  'Tortoiseshell coat with orange patches. Likes the sunny side of the garden.',
  'Long gray and white coat. Usually rests near the water station.',
  'Cream coat and pink nose. Often comes by in the morning.',
  'Tabby coat with a white chest. Likes to sit near the shelter.',
  'Long orange and white coat. Familiar with the care team.',
  'Gray coat and yellow eyes. Usually waits in a quiet spot.',
  'Cream coat with dark ears and blue eyes. Often seen at dusk.',
  'Tabby and white coat. Likes the sunny side of the garden.',
  'Long black and white coat. Usually stays close to the shelter.',
  'Long brown tabby coat. Often arrives early for meals.',
]
export const communityColonies: Colony[] = colonyLocations.map(({ name, coordinates }, index) => ({
  id: `community-colony-${String(index + 1).padStart(2, '0')}`,
  name,
  coordinates,
}))

const colonyIds = ['riverside', 'canal', 'grove', ...communityColonies.map((colony) => colony.id)]
let sequence = 0
export const communityCats: Cat[] = counts.flatMap((total, colonyIndex) =>
  Array.from({ length: total - (colonyIndex < 3 ? 1 : 0) }, () => {
    const index = sequence++
    const year = 2017 + index % 9
    const month = String((index * 5) % 12 + 1).padStart(2, '0')
    const day = String((index * 7) % 27 + 1).padStart(2, '0')
    return {
      id: `community-cat-${String(index + 1).padStart(3, '0')}`,
      colonyId: colonyIds[colonyIndex]!,
      name: `${names[index % names.length]}${suffixes[Math.floor(index / names.length)]}`,
      birthDate: `${year}-${month}-${day}`,
      birthDateEstimated: index % 3 === 0,
      description: descriptions[index % descriptions.length],
      photoUrl: `/fixtures/generated-community-cats.svg#cat-${String(index % 16).padStart(2, '0')}`,
    }
  }),
)
