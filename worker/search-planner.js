import { getCanonicalWorkspace } from "./census.js";
import { predictLostCatLocation } from "./triage-agent.js";

export const searchAnchors = {
  "Riverwalk Lot": { lat: 26.128, lng: -80.143 },
  "Little River Laundry": { lat: 25.858, lng: -80.205 },
  "Flagler Yard": { lat: 25.771, lng: -80.217 },
  "Canal Commons": { lat: 25.9, lng: -80.188 },
  "Miami Beach": { lat: 25.794, lng: -80.133 },
  Hialeah: { lat: 25.879, lng: -80.299 },
  Homestead: { lat: 25.468, lng: -80.478 },
  "Hollywood / Broward": { lat: 26.01, lng: -80.15 },
};

export function searchZones(input, now = Date.now()) {
  const anchor = searchAnchors[input.lastSeenArea];
  const seen = Date.parse(input.lastSeenAt);
  if (!anchor || !Number.isFinite(seen) || seen > now + 60_000) throw new Error("Choose a supported demo area and a last-seen time in the past.");
  const hours = Math.max(0, (now - seen) / 3_600_000);
  // Transparent search-planning heuristic, not a calibrated animal-movement model.
  const radius = Math.min(1800, Math.round(100 + Math.sqrt(hours) * 65));
  return [
    { id: "zone-last", title: "Last-seen area", position: anchor, internalRadiusMeters: radius, confidence: .65, detail: "Begin with a quiet observation from an approved public approach. This is the supplied broad-area anchor." },
    { id: "zone-cover", title: "Dry, shaded cover to verify", position: { lat: anchor.lat + .0018, lng: anchor.lng - .0015 }, internalRadiusMeters: Math.round(radius * 1.25), confidence: .45, detail: "Ask a local volunteer to verify accessible vegetation or covered edges. This fictional offset does not identify an actual hiding spot." },
    { id: "zone-home", title: "Familiar feeding approach", position: { lat: anchor.lat - .0013, lng: anchor.lng + .0016 }, internalRadiusMeters: Math.round(radius * 1.5), confidence: .35, detail: "Coordinate a normal feeding observation. Confirm permission and current weather before making a field task." },
  ].map((zone) => ({ ...zone, area: input.lastSeenArea, layer: "searches", locationSignal: "last-seen", status: "Unverified search suggestion", observedAt: "Last seen " + new Date(seen).toISOString() }));
}

export async function planStoredCatSearch(input, env) {
  const zones = searchZones(input);
  const workspace = await getCanonicalWorkspace(env.DB);
  const words = `${input.name ?? ""} ${input.description ?? ""}`.toLowerCase().split(/\W+/).filter((word) => word.length > 2);
  const matches = workspace.cats.filter((cat) => cat.status !== "merged").map((cat) => {
    const nameMatch = String(input.name ?? "").toLowerCase() === cat.name.toLowerCase();
    const terms = `${cat.name} ${cat.coat ?? ""} ${cat.markings ?? ""}`.toLowerCase();
    const hits = words.filter((word) => terms.includes(word)).length;
    return { catKey: cat.cat_key, name: cat.name, score: nameMatch ? .85 : Math.min(.65, hits / Math.max(words.length, 1)), lastSeenAt: cat.last_seen_at, colonies: cat.colonies };
  }).filter((cat) => cat.score > .2).sort((a, b) => b.score - a.score).slice(0, 3);
  const result = await predictLostCatLocation({ ...input, storedMatches: matches }, env);
  return { ...result, matchedCatName: matches[0]?.name ?? null, identityConfidence: matches[0]?.score ?? 0, matches, zones, photoAnalysis: "Photos stay in the separate private evidence desk; this search uses text and stored records, not visual identity recognition.", radiusBasis: "Illustrative radius grows with time since last sighting. A tracker checkbox cannot prove a current GPS fix. Zone scores are heuristic priorities, not calibrated probabilities." };
}
