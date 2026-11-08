import type { InboxData, InboxReport } from '../types'

// Fictional local interaction fixture. No records or messages are fetched or sent.
const base: Pick<InboxReport, 'attachments' | 'thread' | 'history' | 'unread' | 'status' | 'urgent' | 'catId'> = {
  attachments: [], thread: [], history: [], unread: true, status: 'pending', urgent: false, catId: '',
}

/** Detailed scenarios for focused interaction stories. */
export const inboxScenarioData: InboxData = {
  colonies: [{ id: 'riverside', name: 'Riverside', coordinates: [-80.249, 25.812] }, { id: 'canal', name: 'Canal', coordinates: [-80.226, 25.797] }, { id: 'grove', name: 'Grove', coordinates: [-80.243, 25.771] }],
  cats: [{ id: 'pepper', colonyId: 'riverside', name: 'Pepper', photoUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=200&q=80' }, { id: 'miso', colonyId: 'canal', name: 'Miso' }, { id: 'olive', colonyId: 'grove', name: 'Olive' }],
  tasks: [],
  members: ['Alex Morgan', 'Maya Rivera', 'Sam Chen'],
  reports: [
    { ...base, id: 'report-injury', title: 'Possible injury near the feeding station', reporter: 'Maya Rivera', submittedAt: '2026-11-07T10:40:00-05:00', message: 'Pepper was limping on his front paw this morning. He stayed by the fence and did not come over for food. I left water nearby. Can someone check on him?', category: 'Care concern', colonyId: 'riverside', catId: 'pepper', careNote: 'Reported limping on a front paw and reduced interest in food. Needs a care check.', urgent: true, attachments: [{ id: 'stock-cat', name: 'cat-sighting.jpg', mimeType: 'image/jpeg', size: 66221, url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1000&q=80' }] },
    { ...base, id: 'report-kittens', title: 'Three kittens spotted behind the shed', reporter: 'Sam Chen', submittedAt: '2026-11-07T09:15:00-05:00', message: 'I saw three small kittens behind the shed at Canal. An adult cat was nearby. I kept my distance and left the area quiet. I do not know whether they are already in our records.', category: 'New sighting', colonyId: 'canal', careNote: 'Three kittens reported behind the shed. Identity and age are unconfirmed.', urgent: true },
    { ...base, id: 'report-feeding', title: 'Morning feeding and fresh water', reporter: 'Alex Morgan', submittedAt: '2026-11-07T08:05:00-05:00', message: 'Morning visit complete at Grove. Four cats came for food, including Olive. Both water bowls are clean and full. There is enough dry food for tomorrow.', category: 'Feeding visit', colonyId: 'grove', catId: 'olive', careNote: 'Morning feeding completed. Four cats seen; fresh water provided.', unread: false },
    { ...base, id: 'report-sighting', title: 'Orange cat by the Canal entrance', reporter: 'Maya Rivera', submittedAt: '2026-11-07T08:35:00-05:00', message: 'An orange cat with a white chest was waiting at the Canal entrance. It looks like Miso, but I could not see the ear clearly.', category: 'Sighting', colonyId: 'canal', catId: 'miso', careNote: 'Orange cat seen at the entrance. Possible Miso sighting; identity needs confirmation.', possibleDuplicateOf: 'report-earlier-sighting' },
    { ...base, id: 'report-location', title: 'Cat seen near a parking lot', reporter: 'Sam Chen', submittedAt: '2026-11-07T11:10:00-05:00', message: 'I spotted a gray cat near the parking lot on my walk. I can send a more exact location when I get back.', category: 'New sighting', colonyId: '', careNote: 'Gray cat sighting. Waiting for an exact location to identify the colony.' },
    { ...base, id: 'report-waiting', title: 'Evening feeding cover needed', reporter: 'Maya Rivera', submittedAt: '2026-11-06T17:20:00-05:00', message: 'I cannot make my next evening visit at Riverside. Could someone cover for me?', category: 'Feeding cover', colonyId: 'riverside', careNote: 'Feeding cover requested. Visit date needs confirmation.', status: 'waiting', unread: false, thread: [{ id: 'question-date', author: 'Alex Morgan', text: 'Which date and time do you need covered?' }], history: ['Alex Morgan requested the visit date and time.'] },
    { ...base, id: 'report-earlier-sighting', title: 'Miso seen at the Canal entrance', reporter: 'Alex Morgan', submittedAt: '2026-11-07T08:25:00-05:00', message: 'Miso was at the Canal entrance during the morning round. Orange coat, white chest, and tipped ear confirmed.', category: 'Sighting', colonyId: 'canal', catId: 'miso', careNote: 'Miso sighting confirmed at the Canal entrance.', status: 'processed', unread: false, history: ['Alex Morgan confirmed the Miso sighting and finished the review.'] },
  ],
}

const activities = [
  { title: 'Feeding visit complete', category: 'Feeding visit', message: 'The feeding visit is complete. Food dishes were cleaned and fresh water is available.' },
  { title: 'Water bowls refilled', category: 'Feeding visit', message: 'Both water bowls were nearly empty. They have been washed and refilled.' },
  { title: 'Food supplies running low', category: 'Supplies', message: 'The dry food container is running low. Please include food on the next supply visit.' },
  { title: 'New cat near the garden', category: 'New sighting', message: 'An unfamiliar cat was seen near the garden. Its identity and ear-tip status are unconfirmed.' },
  { title: 'Shelter needs a weather check', category: 'Shelter', message: 'The shelter entrance was damp after rain. Please check the bedding during the next visit.' },
  { title: 'Evening visit cover requested', category: 'Feeding cover', message: 'The usual volunteer cannot attend an evening feeding visit. Cover and the visit time need confirmation.' },
  { title: 'Cat returned to the feeding area', category: 'Sighting', message: 'A familiar cat returned to the feeding area and stayed for food. No identity change is requested.' },
  { title: 'Litter beside the feeding station', category: 'Site care', message: 'Litter was found beside the feeding station. Please bring a bag and gloves for the next cleanup.' },
  { title: 'Follow-up care check', category: 'Care concern', message: 'Please arrange a follow-up observation and record appetite, movement, and any change since the previous visit.' },
  { title: 'Feeding area cleaned', category: 'Site care', message: 'The feeding area has been cleared of old food and litter. Dishes are clean and the path is clear.' },
]

const followUpTasks = [
  'Check food and water',
  'Check the water bowls',
  'Restock food supplies',
  'Look for the unfamiliar cat',
  'Check shelter bedding',
  'Confirm evening feeding cover',
  'Check on the returning cat',
  'Clean the feeding area',
  'Arrange a follow-up care check',
  'Inspect the feeding area',
]
const taskDueDates = ['2026-11-08', '2026-11-09', '2026-11-10', '']

const additionalReports: InboxReport[] = Array.from({ length: 93 }, (_, index): InboxReport => {
  const status = index < 55 ? 'pending' : index < 74 ? 'waiting' : 'processed'
  const colony = inboxScenarioData.colonies[index % inboxScenarioData.colonies.length]!
  const reporter = inboxScenarioData.members[Math.floor(index / 3) % inboxScenarioData.members.length]!
  const reviewer = inboxScenarioData.members[(index + 1) % inboxScenarioData.members.length]!
  const activity = activities[index % activities.length]!
  const urgent = status === 'pending' && index % 13 === 0
  const unknownLocation = status !== 'processed' && index % 17 === 0
  const cat = inboxScenarioData.cats.find((cat) => cat.colonyId === colony.id)
  const title = urgent ? 'Care check requested' : activity.title
  const message = urgent
    ? 'One cat stayed away from food and appeared uncomfortable. Please arrange a care check. The observer could not confirm the cause.'
    : activity.message
  return {
    id: `report-visit-${index + 1}`,
    title: `${title} ${unknownLocation ? 'near the parking lot' : `at ${colony.name}`}`,
    reporter,
    submittedAt: new Date(Date.parse('2026-11-07T07:30:00-05:00') - index * 80 * 60_000).toISOString(),
    message,
    category: urgent ? 'Care concern' : activity.category,
    colonyId: unknownLocation ? '' : colony.id,
    catId: !unknownLocation && activity.category === 'Sighting' ? cat?.id ?? '' : '',
    careNote: `${message}${unknownLocation ? ' Exact location needs confirmation.' : ''}`,
    urgent,
    unread: status !== 'processed' && index % 3 !== 0,
    status,
    attachments: [],
    thread: status === 'waiting' ? [{ id: `visit-question-${index + 1}`, author: reviewer, text: 'Can you confirm the exact location and the time of your visit?' }] : [],
    history: status === 'processed' ? [`${reviewer} confirmed the report details and finished the review.`] : status === 'waiting' ? [`${reviewer} requested more details.`] : [],
  }
})

/** Static workspace dataset: 60 pending, 20 waiting, and 20 processed. */
export const localInboxData: InboxData = {
  ...inboxScenarioData,
  reports: [...inboxScenarioData.reports, ...additionalReports],
  tasks: additionalReports.flatMap((report, index) => index % 11 === 0 ? [{
    id: `visit-task-${index + 1}`, reportId: report.id, title: report.urgent ? 'Arrange a care check' : followUpTasks[index % followUpTasks.length]!,
    owner: inboxScenarioData.members[(index + 1) % inboxScenarioData.members.length]!, ownerId: `story:${inboxScenarioData.members[(index + 1) % inboxScenarioData.members.length]!}`, due: taskDueDates[Math.floor(index / 11) % taskDueDates.length]!, status: 'open' as const, associations: [],
  }] : []),
}
