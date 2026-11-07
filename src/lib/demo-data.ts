export type MapLayer = "colonies" | "sightings" | "urgent" | "hazards" | "searches" | "feeding";

export type MapRecord = {
  id: string;
  title: string;
  area: string;
  position: { lat: number; lng: number };
  layer: MapLayer;
  status: string;
  detail: string;
  /** Precision applies only to the synthetic demo record, never a real rescue site. */
  locationSignal: "live-tag" | "verified-sighting" | "last-seen" | "colony-home-range" | "unconfirmed-report";
  confidence: number;
  internalRadiusMeters: number;
  observedAt: string;
};

/**
 * Fictional, deliberately approximate demo anchors. They are not sightings,
 * colony locations, feeder locations, or an estimate of real cat activity.
 */
export const mapRecords: MapRecord[] = [
  { id: "col-lr", title: "Little River Laundry", area: "Little River", position: { lat: 25.858, lng: -80.205 }, layer: "colonies", status: "Review today", detail: "12 cats · 9 fixed · 2 pending TNR", locationSignal: "colony-home-range", confidence: .82, internalRadiusMeters: 260, observedAt: "Updated today" },
  { id: "col-fy", title: "Flagler Yard", area: "Little Havana", position: { lat: 25.771, lng: -80.217 }, layer: "colonies", status: "Urgent case", detail: "9 cats · vet review pending", locationSignal: "colony-home-range", confidence: .79, internalRadiusMeters: 220, observedAt: "Updated 28 min ago" },
  { id: "col-cc", title: "Canal Commons", area: "North Miami", position: { lat: 25.9, lng: -80.188 }, layer: "colonies", status: "Feeding due", detail: "16 cats · 4 pending TNR", locationSignal: "colony-home-range", confidence: .76, internalRadiusMeters: 310, observedAt: "Updated 2 days ago" },
  { id: "col-rw", title: "Riverwalk Lot", area: "Fort Lauderdale", position: { lat: 26.128, lng: -80.143 }, layer: "colonies", status: "Missing search", detail: "7 cats · verified search only", locationSignal: "colony-home-range", confidence: .7, internalRadiusMeters: 340, observedAt: "Updated today" },
  { id: "col-hl", title: "Service-yard group", area: "Hialeah", position: { lat: 25.879, lng: -80.299 }, layer: "colonies", status: "Feeding due", detail: "Synthetic demo cluster", locationSignal: "colony-home-range", confidence: .72, internalRadiusMeters: 280, observedAt: "Updated yesterday" },
  { id: "col-hm", title: "South Dade group", area: "Homestead", position: { lat: 25.468, lng: -80.478 }, layer: "colonies", status: "Monitor", detail: "Synthetic demo cluster", locationSignal: "colony-home-range", confidence: .67, internalRadiusMeters: 420, observedAt: "Updated 3 days ago" },
  { id: "col-mb", title: "Beach service-corridor group", area: "Miami Beach", position: { lat: 25.79, lng: -80.13 }, layer: "colonies", status: "Monitor", detail: "Synthetic demo cluster", locationSignal: "colony-home-range", confidence: .69, internalRadiusMeters: 250, observedAt: "Updated yesterday" },
  { id: "seen-1", title: "Orange tabby report", area: "Little River", position: { lat: 25.854, lng: -80.201 }, layer: "sightings", status: "Match review", detail: "Marmalade candidate · photo evidence", locationSignal: "verified-sighting", confidence: .91, internalRadiusMeters: 85, observedAt: "Seen 1 hour ago" },
  { id: "seen-2", title: "New kitten report", area: "North Miami", position: { lat: 25.894, lng: -80.194 }, layer: "sightings", status: "Unconfirmed", detail: "Volunteer estimated three kittens", locationSignal: "unconfirmed-report", confidence: .54, internalRadiusMeters: 480, observedAt: "Reported 2 hours ago" },
  { id: "urgent-1", title: "Poppy vet review", area: "Little Havana", position: { lat: 25.767, lng: -80.228 }, layer: "urgent", status: "Injury", detail: "Private, human review required", locationSignal: "verified-sighting", confidence: .81, internalRadiusMeters: 110, observedAt: "Seen 28 min ago" },
  { id: "urgent-2", title: "Pregnancy assessment", area: "Little River", position: { lat: 25.862, lng: -80.211 }, layer: "urgent", status: "Time-sensitive", detail: "Private, human review required", locationSignal: "verified-sighting", confidence: .9, internalRadiusMeters: 95, observedAt: "Seen 1 hour ago" },
  { id: "hazard-1", title: "Traffic safety task", area: "Downtown Miami", position: { lat: 25.777, lng: -80.191 }, layer: "hazards", status: "Review", detail: "Synthetic hazard layer", locationSignal: "unconfirmed-report", confidence: .66, internalRadiusMeters: 350, observedAt: "Reported today" },
  { id: "hazard-2", title: "Flood watch task", area: "Florida City", position: { lat: 25.451, lng: -80.478 }, layer: "hazards", status: "Review", detail: "Synthetic hazard layer", locationSignal: "unconfirmed-report", confidence: .61, internalRadiusMeters: 550, observedAt: "Reported today" },
  { id: "hazard-mb", title: "Traffic + heat review", area: "Miami Beach", position: { lat: 25.785, lng: -80.134 }, layer: "hazards", status: "Review", detail: "Synthetic barrier-island safety layer", locationSignal: "unconfirmed-report", confidence: .63, internalRadiusMeters: 360, observedAt: "Reported today" },
  { id: "search-1", title: "Tux search route", area: "Fort Lauderdale", position: { lat: 26.133, lng: -80.15 }, layer: "searches", status: "Assigned", detail: "Three approved cover spots", locationSignal: "last-seen", confidence: .58, internalRadiusMeters: 780, observedAt: "Last seen Tuesday" },
  { id: "search-2", title: "Under-cover follow-up", area: "Wynwood", position: { lat: 25.8, lng: -80.199 }, layer: "searches", status: "Assigned", detail: "Verified volunteer task", locationSignal: "last-seen", confidence: .64, internalRadiusMeters: 520, observedAt: "Last seen yesterday" },
  { id: "feed-1", title: "Evening feed", area: "Little River", position: { lat: 25.861, lng: -80.207 }, layer: "feeding", status: "Confirmed", detail: "Joel · 6:24 PM", locationSignal: "live-tag", confidence: .98, internalRadiusMeters: 28, observedAt: "Live tag · 2 min ago" },
  { id: "feed-2", title: "Route check", area: "Cutler Bay", position: { lat: 25.591, lng: -80.341 }, layer: "feeding", status: "Confirmed", detail: "Synthetic demo record", locationSignal: "verified-sighting", confidence: .84, internalRadiusMeters: 130, observedAt: "Seen today" },
  { id: "live-scout", title: "Skipper · demo tracker", area: "Miami Beach", position: { lat: 25.794, lng: -80.133 }, layer: "sightings", status: "Live tag · synthetic", detail: "Updates every six seconds in the demo", locationSignal: "live-tag", confidence: .98, internalRadiusMeters: 26, observedAt: "Live demo ping" },
];

export const demoChats = [
  { person: "Maya R.", time: "5:46 PM", type: "location", copy: "Location shared · DEMO APPROXIMATE PIN — Flagler Yard area, Little Havana. Not a real operating location." },
  { person: "Maya R.", time: "5:46 PM", type: "message", copy: "I saw the split-face calico again beside the pallets. She held up her front paw and did not come to the food. I think this needs a vet check. Count at the area: 6 adults.", image: "/demo-assets/poppy-calico-limp.png", label: "Poppy, fictional demo photo" },
  { person: "Alex · coordinator", time: "5:48 PM", type: "reply", copy: "Thanks — please do not approach. I’m sending this to review as urgent. Did you see any bleeding?" },
  { person: "Joel M.", time: "6:04 PM", type: "location", copy: "Location shared · DEMO APPROXIMATE PIN — Little River Laundry area. Not a real operating location." },
  { person: "Joel M.", time: "6:04 PM", type: "message", copy: "Orange tabby with white chin came out for food. Her belly looks bigger than last week — possibly pregnant. Fed 7; I saw 1 new gray cat behind the bins.", image: "/demo-assets/marmalade-orange-tabby.png", label: "Marmalade, fictional demo photo" },
  { person: "Rina P.", time: "6:08 PM", type: "message", copy: "I photographed that same orange tabby on Tuesday by the service alley. White chin and the small left-ear nick match. I think it is Marmalade, but please review before merging." },
  { person: "Alex · coordinator", time: "6:10 PM", type: "reply", copy: "Logged as a match suggestion only. Need one person to confirm the duplicate / pregnancy status." },
  { person: "Rina P.", time: "6:31 PM", type: "message", copy: "Tux has not shown up at the Riverwalk demo colony since Tuesday. Last known area was by the shrubs near the footpath. White chest, white paws, tiny white spot under nose.", image: "/demo-assets/tux-missing-search.png", label: "Tux, fictional demo photo" },
];

export const colonyStats = [
  ["Little River Laundry", "Little River", "12", "9", "2", "Yesterday · Joel", "Review today"],
  ["Flagler Yard", "Little Havana", "9", "7", "1", "Today · Maya", "Urgent case"],
  ["Canal Commons", "North Miami", "16", "11", "4", "2 days ago · Rina", "Feeding due"],
  ["Riverwalk Lot", "Fort Lauderdale", "7", "5", "2", "Today · Ana", "Covered"],
] as const;

/** Complete but fictional records used only in the hackathon demo. */
export type DemoCatProfile = {
  id: string;
  name: string;
  image?: string;
  tone: "urgent" | "warning" | "good" | "violet" | "neutral";
  status: string;
  species: string;
  sex: string;
  estimatedDob: string;
  estimatedAge: string;
  breed: string;
  coat: string;
  markings: string;
  microchip: string;
  earTip: string;
  colony: string;
  tracker: string;
  lastSeen: string;
  care: string;
  vaccinations: string;
  history: { time: string; event: string; note: string }[];
};

export const catProfiles: DemoCatProfile[] = [
  {
    id: "marmalade", name: "Marmalade", image: "/demo-assets/marmalade-orange-tabby.png", tone: "warning", status: "Pregnancy review", species: "Domestic cat", sex: "Female", estimatedDob: "Est. Mar 2023", estimatedAge: "Est. 3 yrs", breed: "Domestic shorthair", coat: "Orange tabby", markings: "White chin; small nick on left ear", microchip: "No scan on file", earTip: "Left ear tipped · TNR completed", colony: "Little River Laundry", tracker: "No live tag", lastSeen: "Today · 6:04 PM", care: "Coordinator review before trap plan", vaccinations: "Rabies recorded · May 2026", history: [
      { time: "Today · 6:04 PM", event: "Feeding + visual check", note: "Joel photographed orange tabby at the demo feeding area; possible pregnancy flagged for review." },
      { time: "Tue · 5:12 PM", event: "Possible duplicate", note: "Rina’s photo shares the white chin and left-ear nick. Human confirmation still required." },
      { time: "May 2026", event: "TNR record", note: "Fictional demo record: returned after TNR and rabies vaccination." },
    ],
  },
  {
    id: "poppy", name: "Poppy", image: "/demo-assets/poppy-calico-limp.png", tone: "urgent", status: "Needs vet review", species: "Domestic cat", sex: "Female", estimatedDob: "Est. May 2022", estimatedAge: "Est. 4 yrs", breed: "Domestic shorthair", coat: "Split-face calico", markings: "Orange/black face split; white front paw", microchip: "Not scanned", earTip: "Unknown — keep separate until verified", colony: "Flagler Yard", tracker: "No live tag", lastSeen: "Today · 5:46 PM", care: "Limping report; safe observation only", vaccinations: "Unknown · clinic check needed", history: [
      { time: "Today · 5:46 PM", event: "Urgent field report", note: "Maya noted a front-paw limp and low food interest; photo and approximate pin were attached." },
      { time: "Last week", event: "Prior observation", note: "Calico was seen by a loading dock; no medical diagnosis was made." },
      { time: "Pending", event: "Care decision", note: "A coordinator must approve medical action; status is not automated." },
    ],
  },
  {
    id: "coal", name: "Coal", tone: "warning", status: "Needs TNR", species: "Domestic cat", sex: "Unknown", estimatedDob: "Est. 2025", estimatedAge: "Est. 1 yr", breed: "Domestic shorthair", coat: "Solid black", markings: "Small pale patch at chest; no visible ear tip", microchip: "Not scanned", earTip: "No ear tip observed", colony: "Canal Commons", tracker: "No live tag", lastSeen: "Yesterday · 7:10 PM", care: "TNR candidate · confirm sex before appointment", vaccinations: "None recorded", history: [
      { time: "Yesterday · 7:10 PM", event: "Census observation", note: "Volunteer count included a young black cat; identity remains a low-confidence individual record." },
      { time: "This week", event: "TNR queue", note: "Added as a candidate, not yet trapped or scheduled." },
    ],
  },
  {
    id: "tux", name: "Tux", image: "/demo-assets/tux-missing-search.png", tone: "violet", status: "Missing · search plan", species: "Domestic cat", sex: "Male", estimatedDob: "Est. 2024", estimatedAge: "Est. 2 yrs", breed: "Domestic shorthair", coat: "Black tuxedo", markings: "White chest, paws, and small white spot below nose", microchip: "Not scanned", earTip: "Right ear tipped · TNR completed", colony: "Riverwalk Lot", tracker: "No live tag · probability search only", lastSeen: "Tue · 6:00 PM", care: "Coordinator-approved search tasks open", vaccinations: "Rabies recorded · Apr 2026", history: [
      { time: "Tue · 6:00 PM", event: "Last verified sighting", note: "Seen near familiar shrub cover in a fictional, approximate demo area." },
      { time: "Today", event: "Search plan generated", note: "Agentic navigator proposed probability zones; a person assigns all volunteer tasks." },
      { time: "Apr 2026", event: "TNR record", note: "Fictional demo record: right ear tip and rabies vaccination recorded." },
    ],
  },
  {
    id: "skipper", name: "Skipper", tone: "good", status: "Tracked · demo only", species: "Domestic cat", sex: "Female", estimatedDob: "Est. 2023", estimatedAge: "Est. 3 yrs", breed: "Domestic shorthair", coat: "Gray tabby", markings: "Silver tabby coat; clipped left ear", microchip: "Fictional demo ID only", earTip: "Left ear tipped · TNR completed", colony: "Beach service-corridor group", tracker: "Live demo tag · internal view only", lastSeen: "Live simulated ping", care: "Observe only; no field action generated from a tag alone", vaccinations: "Rabies recorded · Jun 2026", history: [
      { time: "Live demo", event: "Tracker simulation", note: "A fictional tag updates the internal map every six seconds to demonstrate changing location confidence." },
      { time: "Yesterday", event: "Feeding observation", note: "Verified volunteer recorded normal feeding behavior in the synthetic demo area." },
      { time: "Jun 2026", event: "TNR record", note: "Fictional demo record: returned after TNR and rabies vaccination." },
    ],
  },
];

export const searchPredictionRecords: MapRecord[] = [
  { id: "search-last-seen", title: "Last-seen probability zone", area: "Riverwalk Lot", position: { lat: 26.133, lng: -80.15 }, layer: "searches", status: "Priority 1", detail: "Last seen + familiar cover", locationSignal: "last-seen", confidence: .64, internalRadiusMeters: 780, observedAt: "Last seen Tuesday evening" },
  { id: "search-cover", title: "Covered-edge follow-up", area: "Riverwalk Lot", position: { lat: 26.128, lng: -80.156 }, layer: "searches", status: "Priority 2", detail: "Shrub and service-edge cover", locationSignal: "unconfirmed-report", confidence: .49, internalRadiusMeters: 540, observedAt: "Derived from familiar movement pattern" },
  { id: "search-colony", title: "Home-range check", area: "Riverwalk Lot", position: { lat: 26.128, lng: -80.143 }, layer: "searches", status: "Priority 3", detail: "Usual feeding approach", locationSignal: "colony-home-range", confidence: .42, internalRadiusMeters: 420, observedAt: "Current colony context" },
  { id: "search-beach-last", title: "Beach last-seen probability zone", area: "Miami Beach", position: { lat: 25.79, lng: -80.13 }, layer: "searches", status: "Priority 1", detail: "Last-seen area + shade check", locationSignal: "last-seen", confidence: .61, internalRadiusMeters: 690, observedAt: "Synthetic last-seen demo" },
  { id: "search-beach-cover", title: "Beach cover follow-up", area: "Miami Beach", position: { lat: 25.795, lng: -80.135 }, layer: "searches", status: "Priority 2", detail: "Covered service-edge check", locationSignal: "unconfirmed-report", confidence: .46, internalRadiusMeters: 520, observedAt: "Derived from safe-cover context" },
  { id: "search-beach-home", title: "Beach home-range check", area: "Miami Beach", position: { lat: 25.786, lng: -80.128 }, layer: "searches", status: "Priority 3", detail: "Usual feeding approach", locationSignal: "colony-home-range", confidence: .4, internalRadiusMeters: 390, observedAt: "Synthetic home-range context" },
];
