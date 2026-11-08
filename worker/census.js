import { getCareOutcomeStates } from "./reports.js";
/** Canonical, traceable census projection. No parser or materializer can merge cats. */
const META = {
  "CAT-02": { name: "Marmalade", photo: "/demo-assets/marmalade-orange-tabby.png", fixed: null, tnr: "ear tip disputed" },
  "CAT-02-ALT": { name: "Marmalade candidate", photo: "/demo-assets/marmalade-orange-tabby.png", fixed: null, tnr: "unconfirmed duplicate" },
  "CAT-04": { name: "Poppy", photo: "/demo-assets/poppy-calico-limp.png", fixed: null, tnr: "unknown" },
  "CAT-11": { name: "Tux", photo: "/demo-assets/tux-missing-search.png", fixed: true, tnr: "completed" },
  "CAT-COAL": { name: "Coal", photo: null, fixed: false, tnr: "pending" },
  "CAT-SKIPPER": { name: "Skipper", photo: null, fixed: null, tnr: "unknown", tracker: "Simulated demo tag · six-second pings" },
};
const DETAILS = {
  "CAT-02": { coat: "Orange tabby", markings: "White chin; left-ear nick under review", sex: "Female, reported", estimated_dob: "2023-03 (estimated)", breed: "Domestic shorthair" },
  "CAT-02-ALT": { coat: "Orange tabby", markings: "White chin; possible left-ear nick", sex: "Unknown", estimated_dob: null, breed: "Domestic shorthair, unverified" },
  "CAT-04": { coat: "Split-face calico", markings: "Orange/black face split; white front paw", sex: "Female, reported", estimated_dob: "2022-05 (estimated)", breed: "Domestic shorthair" },
  "CAT-11": { coat: "Black and white tuxedo", markings: "White chest, white paws, tiny white spot under nose", sex: "Male, synthetic record", estimated_dob: "2021-06 (estimated)", breed: "Domestic shorthair" },
  "CAT-COAL": { coat: "Black", markings: "Ear tip not verified", sex: "Unknown", estimated_dob: null, breed: "Unknown" },
  "CAT-SKIPPER": { coat: "Gray tabby", markings: "Dark stripes; simulated tracker collar", sex: "Unknown", estimated_dob: "2024-02 (estimated)", breed: "Domestic shorthair" },
};
function fail(message) { throw new Error(`Canonical census rejected: ${message}`); }
function key(value, field) { const out = String(value ?? "").trim(); if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(out)) fail(`invalid ${field}`); return out; }
function actor(value) { const out = Number(value); if (!Number.isInteger(out) || out < 1) fail("reviewerId must be a valid user ID"); return out; }
function note(value) { const out = String(value ?? "").trim(); if (!out || out.length > 500) fail("invalid reasoning"); return out; }
async function all(db, sql, ...params) { if (!db?.prepare) fail("D1 binding required"); const res = await db.prepare(sql).bind(...params).all(); return res.results ?? res ?? []; }
async function first(db, sql, ...params) { return (await db.prepare(sql).bind(...params).first()) ?? null; }
function stmt(db, sql, ...params) { return db.prepare(sql).bind(...params); }
async function exec(db, list) { if (!list.length) return; return db.batch ? db.batch(list) : Promise.all(list.map((item) => item.run())); }

export async function seedCanonicalCatsFromObservations(db, { at = new Date().toISOString() } = {}) {
  const rows = await all(db, "SELECT DISTINCT proposed_cat_key AS cat_key, id AS observation_id FROM intake_observations WHERE proposed_cat_key IS NOT NULL");
  await exec(db, rows.map((row) => stmt(db, "INSERT OR IGNORE INTO canonical_cats (cat_key, canonical_cat_key, status, created_from_observation_id, created_at, updated_at) VALUES (?, ?, 'active', ?, ?, ?)", key(row.cat_key, "catKey"), key(row.cat_key, "catKey"), row.observation_id, at, at)));
  return { createdOrExisting: rows.length };
}

/** Independent aggregates avoid feeder/review join fan-out. */
export async function materializeCanonicalCensus(db, { materializedAt = new Date().toISOString() } = {}) {
  const [base, urgent, tnr, feeds] = await Promise.all([
    all(db, "SELECT o.proposed_colony_key AS colony_key, MIN(m.broad_area) AS broad_area, COUNT(DISTINCT COALESCE(NULLIF(c.canonical_cat_key, ''), o.proposed_cat_key)) AS cat_count, COUNT(DISTINCT o.id) AS source_event_count FROM intake_observations o JOIN intake_source_messages m ON m.id=o.source_message_id LEFT JOIN canonical_cats c ON c.cat_key=o.proposed_cat_key WHERE o.proposed_colony_key IS NOT NULL GROUP BY o.proposed_colony_key"),
    all(db, "SELECT o.proposed_colony_key AS colony_key, COUNT(DISTINCT q.id) AS count FROM intake_review_queue q JOIN intake_observations o ON o.id=q.observation_id WHERE q.review_kind='urgent_care' AND q.status='open' GROUP BY o.proposed_colony_key"),
    all(db, "SELECT o.proposed_colony_key AS colony_key, COUNT(DISTINCT q.id) AS count FROM intake_review_queue q JOIN intake_observations o ON o.id=q.observation_id WHERE q.review_kind='new_cat' AND q.status='open' GROUP BY o.proposed_colony_key"),
    all(db, "SELECT colony_key, feeder_alias AS last_feeder, visited_at AS last_fed_at FROM (SELECT colony_key, feeder_alias, visited_at, id, ROW_NUMBER() OVER (PARTITION BY colony_key ORDER BY julianday(visited_at) DESC, id DESC) AS rank FROM feeder_visit_log WHERE feeding_confirmed=1) WHERE rank=1"),
  ]);
  const lookup = (rows) => new Map(rows.map((row) => [row.colony_key, Number(row.count ?? 0)])); const urgentMap = lookup(urgent), tnrMap = lookup(tnr), feedMap = new Map(feeds.map((row) => [row.colony_key, row]));
  const colonies = base.map((row) => ({ colony_key: row.colony_key, broad_area: row.broad_area, cat_count: Number(row.cat_count ?? 0), fixed_count: 0, tnr_pending: tnrMap.get(row.colony_key) ?? 0, needs_vet: urgentMap.get(row.colony_key) ?? 0, last_feeder: feedMap.get(row.colony_key)?.last_feeder ?? null, last_fed_at: feedMap.get(row.colony_key)?.last_fed_at ?? null, source_event_count: Number(row.source_event_count ?? 0) }));
  await exec(db, colonies.flatMap((row) => [stmt(db, "INSERT OR IGNORE INTO canonical_colonies (colony_key,broad_area,status,created_at,updated_at) VALUES (?,?,'active',?,?)", key(row.colony_key, "colonyKey"), row.broad_area, materializedAt, materializedAt), stmt(db, "INSERT OR REPLACE INTO canonical_census_snapshots (id,colony_key,known_cat_records,urgent_open,tnr_pending,last_feeder_alias,last_fed_at,source_event_count,materialized_at) VALUES (?,?,?,?,?,?,?,?,?)", `SNAP:${row.colony_key}:${materializedAt}`, row.colony_key, row.cat_count, row.needs_vet, row.tnr_pending, row.last_feeder, row.last_fed_at, row.source_event_count, materializedAt)]));
  return getCanonicalWorkspace(db);
}

/** DTO for `/api/private/census`; source body/photos/contacts never appear here. */
export async function getCanonicalWorkspace(db, { publicView = false } = {}) {
  const outcomes = await getCareOutcomeStates(db);
  const [snapshots, cats, history, observations, counts] = await Promise.all([
    all(db, "SELECT s.colony_key,c.broad_area,s.known_cat_records AS cat_count,s.urgent_open AS needs_vet,s.tnr_pending,s.last_feeder_alias AS last_feeder,s.last_fed_at FROM canonical_census_snapshots s JOIN canonical_colonies c ON c.colony_key=s.colony_key WHERE s.id IN (SELECT MAX(id) FROM canonical_census_snapshots GROUP BY colony_key) ORDER BY s.colony_key"),
    all(db, "SELECT cat_key,canonical_cat_key,status,merged_into_cat_key FROM canonical_cats ORDER BY cat_key"),
    all(db, "SELECT colony_key,materialized_at,known_cat_records AS cat_count,urgent_open AS needs_vet,tnr_pending,last_feeder_alias AS last_feeder,last_fed_at FROM canonical_census_snapshots WHERE id IN (SELECT MAX(id) FROM canonical_census_snapshots GROUP BY colony_key) ORDER BY colony_key"),
    all(db, "SELECT o.proposed_cat_key AS cat_key, o.proposed_colony_key AS colony_key, o.urgency, m.received_at, m.trace_id FROM intake_observations o JOIN intake_source_messages m ON m.id=o.source_message_id WHERE o.proposed_cat_key IS NOT NULL ORDER BY julianday(m.received_at) DESC"),
    all(db, "SELECT colony_key, reported_count_low, reported_count_high, count_confidence, event_at FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY colony_key ORDER BY julianday(event_at) DESC, id DESC) AS rank FROM colony_census_events) WHERE rank=1"),
  ]);
  const visibleCats = cats.map((row) => {
    const metadata = META[row.cat_key] ?? { name: "Unconfirmed cat", photo: null, fixed: null, tnr: "review needed" };
    const linked = observations.filter((item) => item.cat_key === row.cat_key || (row.status !== "merged" && cats.some((other) => other.cat_key === item.cat_key && other.canonical_cat_key === row.cat_key)));
    const colonies = [...new Set(linked.map((item) => item.colony_key).filter(Boolean))];
    const outcome = outcomes[row.cat_key];
    const details = DETAILS[row.cat_key] ?? { coat: "Unconfirmed", markings: "Not recorded", sex: "Unknown", estimated_dob: null, breed: "Unknown" };
    return { cat_key: row.cat_key, canonical_cat_key: row.canonical_cat_key, status: row.status, merged_into_cat_key: row.merged_into_cat_key, ...metadata, ...details, fixed: outcome?.fixed ?? metadata.fixed, tnr: outcome?.tnr && outcome.tnr !== "unknown" ? outcome.tnr : metadata.tnr, medical: outcome?.medical ?? "unknown", species: "Domestic cat", microchip: "No verified scan on file", tracker: metadata.tracker ?? "No verified live tag", photo_path: metadata.photo, colony_key: colonies[0] ?? null, colonies, last_seen_at: linked[0]?.received_at ?? null, description: details.coat + " · " + details.markings, vaccinations: row.cat_key === "CAT-11" ? "Synthetic rabies record · April 2026" : "Not recorded" };
  });
  const fixedByColony = new Map();
  const countsByColony = new Map(counts.map((count) => [count.colony_key, { reported_count_low: count.reported_count_low, reported_count_high: count.reported_count_high, count_confidence: count.count_confidence, count_reported_at: count.event_at }]));
  // Metadata is a fictional fixture truth; unknown values are deliberately not counted as fixed.
  for (const cat of visibleCats) if (cat.status !== "merged" && cat.fixed === true) for (const colony of cat.colonies) fixedByColony.set(colony, (fixedByColony.get(colony) ?? 0) + 1);
  return { colonies: snapshots.map((row) => ({ colony_key: row.colony_key, broad_area: row.broad_area, cat_count: Number(row.cat_count ?? 0), ...countsByColony.get(row.colony_key), fixed_count: fixedByColony.get(row.colony_key) ?? 0, tnr_pending: visibleCats.filter((cat) => cat.status !== "merged" && cat.colonies.includes(row.colony_key) && cat.tnr === "pending").length, tnr_unknown: visibleCats.filter((cat) => cat.status !== "merged" && cat.colonies.includes(row.colony_key) && cat.fixed == null && cat.tnr !== "pending").length, needs_vet: Number(row.needs_vet ?? 0), last_feeder: publicView ? null : row.last_feeder ?? null, last_fed_at: row.last_fed_at ?? null })), cats: visibleCats, history: publicView ? [] : [...observations.map((row) => ({ cat_key: row.cat_key, colony_key: row.colony_key, kind: "Source observation", message: row.trace_id + " · " + row.urgency, happened_at: row.received_at })), ...history.map((row) => ({ colony_key: row.colony_key, kind: "Census refreshed", happened_at: row.materialized_at, message: row.cat_count + " identified records" }))], publicView: Boolean(publicView), disclaimer: "Synthetic fixture view; exact locations, contacts, raw source text and attachments are omitted." };
}

/** Human-only review tied to its source observation; active roots prevent cycles/chains. */
export async function applyHumanDedupeDecision(db, { reviewId, reviewerId, sourceCatKey, targetCatKey, decision, reasoning, decidedAt = new Date().toISOString() }) {
  if (!db?.batch) fail("atomic D1 batch support is required for a duplicate decision");
  const review = key(reviewId, "reviewId"), source = key(sourceCatKey, "sourceCatKey"), target = key(targetCatKey, "targetCatKey"); if (source === target) fail("source and target cats must differ"); if (!["confirmed", "kept_separate"].includes(decision)) fail("unsupported duplicate decision");
  const reviewer = actor(reviewerId), why = note(reasoning), auditId = `MERGE:${review}`;
  // The first statement is a single conditional write: it ties the decision to
  // its source observation and requires two active roots with no merged child.
  const guard = stmt(db, `INSERT INTO dedupe_merge_audit (id,review_id,source_cat_key,target_cat_key,decision,reviewer_id,reasoning,decided_at)
    SELECT ?,q.id,?,?,?,?,?,? FROM intake_review_queue q
    JOIN intake_observations o ON o.id=q.observation_id
    JOIN canonical_cats source ON source.cat_key=?
    JOIN canonical_cats target ON target.cat_key=?
    WHERE q.id=? AND q.review_kind='possible_duplicate' AND q.status='open'
      AND o.proposed_cat_key=?
      AND source.status='active' AND target.status='active'
      AND source.merged_into_cat_key IS NULL AND target.merged_into_cat_key IS NULL
      AND source.canonical_cat_key=? AND target.canonical_cat_key=?
      AND NOT EXISTS (SELECT 1 FROM canonical_cats child WHERE child.merged_into_cat_key=source.cat_key)`, auditId, source, target, decision, reviewer, why, decidedAt, source, target, review, source, source, target);
  const close = stmt(db, "UPDATE intake_review_queue SET status=?,resolved_at=? WHERE id=? AND EXISTS (SELECT 1 FROM dedupe_merge_audit WHERE id=?)", decision, decidedAt, review, auditId);
  const merge = decision === "confirmed" ? stmt(db, "UPDATE canonical_cats SET status='merged',merged_into_cat_key=?,canonical_cat_key=?,updated_at=? WHERE cat_key=? AND status='active' AND canonical_cat_key=? AND EXISTS (SELECT 1 FROM dedupe_merge_audit WHERE id=?)", target, target, decidedAt, source, source, auditId) : null;
  const results = await db.batch([guard, close, ...(merge ? [merge] : [])]);
  const changes = Number(results?.[0]?.meta?.changes ?? results?.[0]?.changes ?? 0);
  if (changes !== 1) fail("duplicate decision could not be applied; review may be closed, mismatched, or part of a merge chain");
  return { reviewId: review, decision, auditId, sourceCatKey: source, targetCatKey: target, reviewerId: reviewer, decidedAt };
}

export async function getObservationTrace(db, observationId) { const row = await first(db, "SELECT o.id AS observation_id,m.trace_id,m.source_kind,m.broad_area,m.received_at,b.id AS batch_id,b.provenance,o.urgency,o.requires_human_confirmation FROM intake_observations o JOIN intake_source_messages m ON m.id=o.source_message_id JOIN intake_import_batches b ON b.id=m.batch_id WHERE o.id=?", key(observationId, "observationId")); return row ? { observationId: row.observation_id, traceId: row.trace_id, sourceKind: row.source_kind, broadArea: row.broad_area, receivedAt: row.received_at, batchId: row.batch_id, provenance: row.provenance, urgency: row.urgency, requiresHumanConfirmation: Boolean(row.requires_human_confirmation) } : null; }
