/** Raw fixture parsers. They only transform exported, deliberately synthetic data.
 * Pass their output to `importSyntheticFixture` from `worker/intake.js` to persist. */

const ALLOWED_AREAS = ["Little Havana", "Little River", "North Miami", "Fort Lauderdale", "Miami Beach", "Hialeah", "Homestead", "Hollywood / Broward"];
const CONTACT = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]\d{4}\b/i;

function fail(message) { throw new Error(`Raw synthetic intake rejected: ${message}`); }
function clean(value, max = 2400) { if (typeof value !== "string" || !value.trim() || value.length > max) fail("malformed source text"); if (CONTACT.test(value)) fail("contact data is not supported in fixtures"); return value.trim(); }
function safeId(value) { const id = String(value ?? "").trim(); if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id)) fail("invalid fixture ID"); return id; }
function areaFor(text, fallback = null) { const lower = text.toLowerCase(); const alias = lower.includes("riverwalk") || lower.includes("fort lauderdale") ? "Fort Lauderdale" : lower.includes("little river") ? "Little River" : lower.includes("flagler") || lower.includes("little havana") ? "Little Havana" : lower.includes("north miami") || lower.includes("canal") ? "North Miami" : lower.includes("miami beach") || lower.includes("beach") ? "Miami Beach" : lower.includes("hialeah") ? "Hialeah" : lower.includes("homestead") ? "Homestead" : lower.includes("hollywood") ? "Hollywood / Broward" : fallback; if (!ALLOWED_AREAS.includes(alias)) fail("a broad approved area is required; no location default is inferred"); return alias; }
function countFrom(text) { const found = text.match(/(?:count(?: at the area)?|fed|seen|adults?|conte[io]|vi|gatos?|gatinhos?|chatons?)\D{0,12}(\d{1,2})\b/i); if (!found) return null; const value = Number(found[1]); return Number.isFinite(value) ? { low: value, high: value, confidence: .72 } : null; }
function factsFrom(text) {
  const lower = text.toLowerCase(); const flags = []; let proposedCatKey = null; let proposedColonyKey = null; let duplicateGroup = null;
  if (/calico|front paw|pallet/.test(lower)) { proposedCatKey = "CAT-04"; proposedColonyKey = "COL-04"; const explicitlyNoNewInjury = /no (?:new )?(?:injur(?:y|ies)|bleeding)|sin (?:nuevas? )?(?:heridas?|sangrado)/.test(lower); if (!explicitlyNoNewInjury && (/limp|held up|injur|wound|cojea|herid|mancand/.test(lower) || /bleed/.test(lower))) flags.push("injury"); }
  if (/orange tabby|white chin|marmalade/.test(lower)) { proposedCatKey = "CAT-02"; proposedColonyKey = "COL-02"; if (/pregnan|belly|embaraz|prenhe/.test(lower)) flags.push("pregnancy"); if (/same|match|merge|ear nick|parece el mismo|talvez seja/.test(lower)) { proposedCatKey = "CAT-02-ALT"; duplicateGroup = "MARMALADE-RAW-FIXTURE"; flags.push("possible_duplicate"); } }
  if (/tux|white chest|white paws/.test(lower)) { proposedCatKey = "CAT-11"; proposedColonyKey = "COL-11"; if (/not shown|not appear|missing|last known|last seen|has not/.test(lower)) flags.push("missing"); }
  if (/skipper|gray tabby|grey tabby|silver tabby/.test(lower) && /miami beach|beach/.test(lower)) { proposedCatKey = "CAT-SKIPPER"; proposedColonyKey = "COL-MB-DEMO"; }
  if (/kitten|gatitos|filhotes/.test(lower)) { proposedColonyKey ??= "COL-07"; flags.push("kittens", "uncertain_count"); }
  if (/black cat|solid black|gato preto|gata preta/.test(lower)) { proposedCatKey = "CAT-COAL"; proposedColonyKey ??= "COL-HL-DEMO"; flags.push("new_cat", "tnr_candidate"); }
  if (/traffic/.test(lower)) flags.push("traffic");
  if (/heat|calor|quente/.test(lower)) flags.push("heat");
  if (/flood|flooding|inund|alag/.test(lower)) flags.push("flood");
  if (/no feeder|sin alimentador|sem alimentador|no one can feed/.test(lower)) flags.push("feeder_gap");
  if (!proposedColonyKey && /little river laundry/.test(lower)) proposedColonyKey = "COL-02";
  if (!proposedColonyKey && /flagler yard/.test(lower)) proposedColonyKey = "COL-04";
  if (!proposedColonyKey && /canal commons/.test(lower)) proposedColonyKey = "COL-07";
  if (!proposedColonyKey && /riverwalk/.test(lower)) proposedColonyKey = "COL-11";
  if (!proposedColonyKey && /miami beach|beach/.test(lower)) proposedColonyKey = "COL-MB-DEMO";
  if (!proposedColonyKey && /hialeah/.test(lower)) proposedColonyKey = "COL-HL-DEMO";
  if (!proposedColonyKey && /homestead/.test(lower)) proposedColonyKey = "COL-HM-DEMO";
  if (!proposedColonyKey) proposedColonyKey = null;
  return { proposedCatKey, proposedColonyKey, duplicateGroup, flags: [...new Set(flags)] };
}
function attachmentsFor(text, attachmentMap, id) { const paths = attachmentMap?.[id] ?? []; if (!Array.isArray(paths) || paths.some((path) => typeof path !== "string" || !path.startsWith("/demo-assets/"))) fail("only local demo attachments are supported"); return paths.map((fixturePath) => ({ kind: "image", fixturePath })); }
function respectReportedArea(record) {
  const homes={"COL-02":"Little River","COL-04":"Little Havana","COL-07":"North Miami","COL-11":"Fort Lauderdale","COL-MB-DEMO":"Miami Beach","COL-HL-DEMO":"Hialeah","COL-HM-DEMO":"Homestead"};
  // A descriptive keyword is weaker evidence than the explicitly reported area.
  // Keep its cat candidate for human review, but never auto-route across counties
  // or neighborhoods just because, for example, the message mentions kittens.
  if(record.proposedColonyKey&&homes[record.proposedColonyKey]!==record.broadArea){record.proposedColonyKey=null;record.colonyConfidence=.42;}
  return record;
}

export function parseSyntheticWhatsAppExport({ text, batchId, provenance, defaultBroadArea = null, attachmentMap = {} }) {
  const raw = clean(text, 60_000); if (!/fictional|synthetic|demo/i.test(raw)) fail("WhatsApp export must prominently declare itself synthetic");
  if (!/fictional|synthetic|fixture/i.test(String(provenance ?? ""))) fail("provenance must disclose synthetic status"); safeId(batchId); if (defaultBroadArea) areaFor("", defaultBroadArea);
  const linePattern = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*([^:]+):\s*(.+)$/i;
  const records = []; const senderAreas = new Map(); const lastReportBySenderTime = new Map();
  raw.split(/\r?\n/).forEach((line, index) => {
    const match = line.trim().match(linePattern); if (!match) return;
    const [, date, time, sender, body] = match;
    const senderKey = sender.trim().toLowerCase(); const senderTimeKey = `${senderKey}:${date}:${time}`;
    if (/^<attached:\s*[^>]+>$/i.test(body)) { const lastRecord = lastReportBySenderTime.get(senderTimeKey); if (lastRecord) { const name = body.match(/^<attached:\s*([^>]+)>$/i)?.[1] ?? ""; const existing = attachmentMap[lastRecord.id] ?? []; if (!existing.length && name) lastRecord.attachments.push({ kind: "image", fixturePath: `/demo-assets/${name}` }); } return; }
    if (/messages and calls|mangrove mews demo|(?:synthetic|fictional) training thread|coordinator\)/i.test(`${sender} ${body}`)) return;
    if (/location shared|approximate pin/i.test(body)) { senderAreas.set(senderKey, areaFor(body, defaultBroadArea)); return; }
    const id = `wa-${String(records.length + 1).padStart(3, "0")}`; const combined = `${body} ${sender}`; const facts = factsFrom(combined);
    const colonyArea = facts.proposedColonyKey === "COL-02" ? "Little River" : facts.proposedColonyKey === "COL-04" ? "Little Havana" : facts.proposedColonyKey === "COL-07" ? "North Miami" : facts.proposedColonyKey === "COL-11" ? "Fort Lauderdale" : null;
    const record = { id, sourceKind: "whatsapp_export", volunteerAlias: sender.replace(/[^A-Za-z .'-]/g, "").slice(0, 100) || "Synthetic volunteer", receivedAt: new Date(`${date} ${time} GMT-0500`).toISOString(), broadArea: areaFor(combined, senderAreas.get(senderKey) ?? colonyArea ?? defaultBroadArea), text: body, attachments: attachmentsFor(body, attachmentMap, id), proposedColonyKey: facts.proposedColonyKey, proposedCatKey: facts.proposedCatKey, colonyConfidence: facts.proposedColonyKey ? .76 : .42, count: countFrom(body), feedingConfirmed: /feed complete|fed\s+\d|water refreshed/i.test(body), flags: facts.flags, duplicateGroup: facts.duplicateGroup };
    if (/maybe\s+\d+\s+kittens?/i.test(body)) record.count = { low: 0, high: Number(body.match(/maybe\s+(\d+)/i)?.[1] ?? 3), confidence: .54 };
    records.push(respectReportedArea(record)); lastReportBySenderTime.set(senderTimeKey, record);
  });
  if (!records.length) fail("no parseable WhatsApp fixture records");
  return { schemaVersion: 1, synthetic: true, batchId: safeId(batchId), sourceKind: "whatsapp_export", provenance: String(provenance).trim(), records, parser: { name: "synthetic-whatsapp-export", sourceLines: raw.split(/\r?\n/).length } };
}

export function parseSyntheticSmsRelay({ ndjson, batchId, provenance, defaultBroadArea = null }) {
  const raw = clean(ndjson, 60_000); if (!/fictional|synthetic|fixture/i.test(String(provenance ?? ""))) fail("provenance must disclose synthetic status"); safeId(batchId); if (defaultBroadArea) areaFor("", defaultBroadArea);
  const records = raw.split(/\r?\n/).filter(Boolean).map((line, index) => {
    let item; try { item = JSON.parse(line); } catch { fail(`invalid JSON line ${index + 1}`); }
    if (!/^synthetic|^demo/i.test(String(item.from ?? "")) && !/^demo/i.test(String(item.body ?? ""))) fail("SMS relay record must be marked demo or synthetic");
    const body = clean(item.body); const facts = factsFrom(body); const paths = Array.isArray(item.attachments) ? item.attachments : [];
    const attachments = paths.map((fixturePath) => { if (typeof fixturePath !== "string" || !fixturePath.startsWith("/demo-assets/")) fail("SMS attachment must be a local demo asset"); return { kind: "image", fixturePath }; });
    return respectReportedArea({ id: safeId(item.id ?? `sms-${index + 1}`), sourceKind: "sms_relay", volunteerAlias: clean(item.from ?? "Synthetic relay", 100).replace(/^Synthetic\s+/i, "").slice(0, 100), receivedAt: clean(item.received_at, 64), broadArea: areaFor(`${body} ${item.location ?? ""}`, defaultBroadArea), text: body, attachments, proposedColonyKey: facts.proposedColonyKey, proposedCatKey: facts.proposedCatKey, colonyConfidence: facts.proposedColonyKey ? .76 : .42, count: countFrom(body), feedingConfirmed: /fed\s+\d|feeding complete/i.test(body), flags: facts.flags, duplicateGroup: facts.duplicateGroup });
  });
  if (!records.length) fail("no SMS relay records");
  return { schemaVersion: 1, synthetic: true, batchId: safeId(batchId), sourceKind: "sms_relay", provenance: String(provenance).trim(), records, parser: { name: "synthetic-sms-relay", sourceLines: records.length } };
}

export function sourceTrace(record, { parser, batchId }) { return { traceId: `${batchId}:${record.id}`, parser, sourceMessageId: record.id, sourceKind: record.sourceKind, synthetic: true, broadArea: record.broadArea, attachmentFixturePaths: record.attachments.map((attachment) => attachment.fixturePath) }; }
