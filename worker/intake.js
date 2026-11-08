/**
 * Fixture-only import service for the hackathon demo.
 *
 * It deliberately rejects real/live sources, raw coordinates, phone numbers,
 * email addresses and non-demo attachments. Calls to this module must remain
 * behind an authenticated coordinator-only route when an API route is added.
 */

import { readRoutingThreshold } from "./confirmations.js";
const SOURCE_KINDS = new Set(["whatsapp_export", "sms_relay", "phone_report"]);
const BROAD_AREAS = new Set([
  "Little Havana", "Little River", "North Miami", "Fort Lauderdale",
  "Miami Beach", "Hialeah", "Homestead", "Hollywood / Broward",
]);
const REVIEW_KINDS = new Set(["urgent_care", "possible_duplicate", "uncertain_count", "missing_search", "new_cat"]);

function error(message) { throw new Error(`Synthetic intake rejected: ${message}`); }
function string(value, max, field) {
  if (typeof value !== "string" || !value.trim() || value.length > max) error(`invalid ${field}`);
  return value.trim();
}
function number(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function confidence(value, fallback) {
  const parsed = number(value, fallback);
  return Math.max(0, Math.min(1, parsed));
}
function safeId(value, field) {
  const result = string(value, 120, field);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(result)) error(`invalid ${field}`);
  return result;
}
function hasPrivateContact(value) {
  const text = String(value ?? "");
  return /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)
    || /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]\d{4}\b/.test(text)
    || /\b\d{1,5}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,3}\s+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|place|pl|way)\b/i.test(text);
}
function redacted(value) {
  return String(value ?? "")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted email]")
    .replace(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]\d{4}\b/g, "[redacted phone]")
    .replace(/\b\d{1,5}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,3}\s+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|place|pl|way)\b\.?/gi, "[redacted address]");
}
function stableChecksum(value) {
  // Non-cryptographic change detector: IDs are fixture traceability, not secrets.
  let hash = 2166136261;
  for (const char of JSON.stringify(value)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
/** Calendar-valid ISO source time with an explicit timezone; never infer locale. */
export function normalizeSourceTime(value) {
  const match = typeof value === "string" && value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/);
  if (!match) error("receivedAt must be an ISO timestamp with an explicit timezone");
  const [, year, month, day, hour, minute, second, , zone] = match;
  const y = Number(year), m = Number(month), d = Number(day);
  const days = [31, y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const zoneHour = zone === "Z" ? 0 : Number(zone.slice(1, 3));
  const zoneMinute = zone === "Z" ? 0 : Number(zone.slice(4, 6));
  if (m < 1 || m > 12 || d < 1 || d > days[m - 1] || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59 || zoneHour > 14 || zoneMinute > 59 || (zoneHour === 14 && zoneMinute !== 0) || !Number.isFinite(Date.parse(value))) error("receivedAt has an invalid calendar date or timezone");
  return new Date(value).toISOString();
}
function urgencyFrom(record) {
  const flags = new Set((record.flags ?? []).map((flag) => String(flag).toLowerCase()));
  const text = String(record.text ?? "").toLowerCase().replace(/\bno (?:new )?(?:injur(?:y|ies)|bleeding|illness|sickness)\b/g, "");
  if (["injury", "pregnancy", "kittens", "illness", "feeder_gap", "agent_urgent"].some((flag) => flags.has(flag)) || /injur|limp|bleed|pregnan|kitten|not eating|sick|no feeder|cojea|herid/.test(text)) return "urgent";
  if (["traffic", "missing", "tnr_candidate", "uncertain_count"].some((flag) => flags.has(flag)) || /traffic|missing|maybe|possible/.test(text)) return "watch";
  return "routine";
}
function reviewKinds(record, urgency) {
  const flags = new Set((record.flags ?? []).map((flag) => String(flag).toLowerCase()));
  const kinds = [];
  if (urgency === "urgent") kinds.push("urgent_care");
  if (record.duplicateGroup || flags.has("possible_duplicate")) kinds.push("possible_duplicate");
  if (flags.has("uncertain_count") || (record.count && record.count.low !== record.count.high)) kinds.push("uncertain_count");
  if (flags.has("missing")) kinds.push("missing_search");
  if (flags.has("new_cat")) kinds.push("new_cat");
  return kinds.filter((value) => REVIEW_KINDS.has(value));
}

export function validateSyntheticFixtureBatch(input) {
  if (!input || typeof input !== "object" || input.synthetic !== true) error("only an explicit synthetic fixture is allowed");
  const batchId = safeId(input.batchId, "batchId");
  const sourceKind = string(input.sourceKind, 32, "sourceKind");
  if (!SOURCE_KINDS.has(sourceKind)) error("unsupported sourceKind");
  const provenance = string(input.provenance, 600, "provenance");
  if (!/fictional|synthetic|fixture/i.test(provenance)) error("provenance must disclose synthetic fixture status");
  if (!Array.isArray(input.records) || input.records.length === 0 || input.records.length > 100) error("records must contain 1-100 items");
  const seen = new Set();
  const records = input.records.map((raw) => {
    if (!raw || typeof raw !== "object") error("record must be an object");
    if (["latitude", "longitude", "lat", "lng", "address", "phone", "email"].some((key) => key in raw)) error("fixture records cannot contain precise location or contact fields");
    const id = safeId(raw.id, "record.id"); if (seen.has(id)) error("record IDs must be unique"); seen.add(id);
    const recordSource = raw.sourceKind ? string(raw.sourceKind, 32, "record.sourceKind") : sourceKind;
    if (!SOURCE_KINDS.has(recordSource)) error("unsupported record.sourceKind");
    const text = string(raw.text, 2400, "record.text");
    if (hasPrivateContact(text)) error("record.text contains contact or street-address information");
    const broadArea = string(raw.broadArea, 80, "record.broadArea");
    if (!BROAD_AREAS.has(broadArea)) error("record.broadArea must be an approved broad demo area");
    const attachments = Array.isArray(raw.attachments) ? raw.attachments : [];
    if (attachments.length > 5) error("too many attachments");
    for (const attachment of attachments) {
      if (!attachment || attachment.kind !== "image" || typeof attachment.fixturePath !== "string" || !attachment.fixturePath.startsWith("/demo-assets/")) error("attachments must reference a local demo image");
    }
    const count = raw.count ? {
      low: Math.max(0, Math.floor(number(raw.count.low, 0))),
      high: Math.max(0, Math.floor(number(raw.count.high, 0))),
      confidence: confidence(raw.count.confidence, .5),
    } : null;
    if (raw.count && (![raw.count.low, raw.count.high].every((value) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 200))) error("reported counts must be whole numbers between 0 and 200");
    if (count && count.high < count.low) error("count.high must not be below count.low");
    return {
      id, sourceKind: recordSource, volunteerAlias: string(raw.volunteerAlias, 100, "record.volunteerAlias"),
      receivedAt: normalizeSourceTime(raw.receivedAt), broadArea, text: redacted(text), attachments,
      proposedColonyKey: raw.proposedColonyKey ? safeId(raw.proposedColonyKey, "record.proposedColonyKey") : null,
      proposedCatKey: raw.proposedCatKey ? safeId(raw.proposedCatKey, "record.proposedCatKey") : null,
      colonyConfidence: confidence(raw.colonyConfidence, .5), count, feedingConfirmed: Boolean(raw.feedingConfirmed),
      flags: Array.isArray(raw.flags) ? raw.flags.map((flag) => safeId(String(flag), "record.flag").toLowerCase()).slice(0, 8) : [],
      duplicateGroup: raw.duplicateGroup ? safeId(raw.duplicateGroup, "record.duplicateGroup") : null,
    };
  });
  return { schemaVersion: Number(input.schemaVersion) || 1, synthetic: true, batchId, sourceKind, provenance, records };
}

export function prepareSyntheticImport(input, { now = new Date().toISOString(), colonyMatchThreshold = .75, assessments = {} } = {}) {
  const batch = validateSyntheticFixtureBatch(input);
  const checksum = stableChecksum(batch);
  const messages = batch.records.map((record) => {
    const urgency = assessments[record.id]?.urgency === "urgent" ? "urgent" : urgencyFrom(record);
    const traceId = `${batch.batchId}:${record.id}`;
    const observationId = `OBS:${traceId}`;
    const review = reviewKinds(record, urgency).map((kind) => ({
      id: `REV:${traceId}:${kind}`, kind,
      explanation: kind === "possible_duplicate" ? "Visual/marking evidence is a suggestion only; a coordinator must confirm or keep records separate."
        : kind === "uncertain_count" ? "Reported count remains a range until a verified volunteer confirms it."
        : kind === "missing_search" ? "Private probability search is proposed; a coordinator must approve assignments."
        : kind === "new_cat" ? "New-cat candidate remains separate until a person verifies it."
        : "Potential welfare risk requires a same-day coordinator decision.",
    }));
    return {
      ...record, traceId, messageId: `MSG:${traceId}`, observationId, urgency, review,
      assignedColonyKey: record.proposedColonyKey && record.colonyConfidence >= colonyMatchThreshold ? record.proposedColonyKey : null,
      assignmentState: record.proposedColonyKey && record.colonyConfidence >= colonyMatchThreshold ? "auto" : "unmatched",
      uncertaintyNote: record.count && record.count.low !== record.count.high ? `Reported range: ${record.count.low}-${record.count.high}; confidence ${record.count.confidence}.` : null,
    };
  });
  return { batch: { ...batch, checksum, importedAt: now }, messages, summary: sponsorSafeRollup({ batch, messages }) };
}

// These are deliberately bounded fixture namespaces, not a client-selected
// dedupe key. Unknown batches retain batch-local identities. An apparent stream
// suffix must match an actual record in its registered family.
const ORIGINAL_KINDS = { "wa-001": "whatsapp_export", "sms-002": "sms_relay", "wa-003": "whatsapp_export", "phone-004": "phone_report", "wa-005": "whatsapp_export", "sms-006": "sms_relay", "phone-007": "phone_report", "sms-008": "sms_relay", "wa-009": "whatsapp_export", "sms-010": "sms_relay", "wa-011": "whatsapp_export", "sms-012": "sms_relay" };
const FAMILIES = [
  { name: "fixture-south-florida-2026-11-07-a", aliases: ["fixture-south-florida-2026-11-07-a", "live-shift-v1"], kinds: ORIGINAL_KINDS },
  { name: "fixture-followup-morning-2026-11-08-a", aliases: ["fixture-followup-morning-2026-11-08-a"], kinds: Object.fromEntries(Array.from({ length: 28 }, (_, i) => [i < 14 ? `wa-f${String(i + 1).padStart(2, "0")}` : `sms-f${i + 1}`, i < 14 ? "whatsapp_export" : "sms_relay"])) },
  { name: "fixture-weekend-dispatch-2026-11-08-v1", aliases: ["fixture-weekend-dispatch-2026-11-08-v1"], kinds: Object.fromEntries(Array.from({ length: 72 }, (_, i) => [`${i < 36 ? "wa" : "sms"}-w${String(i + 1).padStart(3, "0")}`, i < 36 ? "whatsapp_export" : "sms_relay"])) },
];
function identityError(message, code = "SOURCE_CONFLICT") { const out = new Error(message); out.status = 409; out.code = code; return out; }
function familyFor(batch) {
  for (const family of FAMILIES) for (const alias of family.aliases) {
    const bulk = batch.batchId === alias;
    if (!bulk && !batch.batchId.startsWith(alias + "-")) continue;
    if (!bulk && (batch.records.length !== 1 || batch.batchId !== alias + "-" + batch.records[0].id)) error("stream batch suffix must match its single registered source record");
    for (const record of batch.records) {
      if (family.kinds[record.id] !== record.sourceKind) error("record ID/source kind is not registered for this fixture family");
      if (record.flags.includes("agent_urgent")) error("agent_urgent is derived output, not registered fixture source evidence");
    }
    return family;
  }
  return { name: "batch:" + batch.batchId, aliases: [batch.batchId], kinds: null };
}
function sourcePayload(record) {
  return { sourceKind: record.sourceKind, volunteerAlias: record.volunteerAlias, receivedAt: normalizeSourceTime(record.receivedAt), broadArea: record.broadArea, text: record.text,
    attachments: record.attachments, proposedColonyKey: record.proposedColonyKey, proposedCatKey: record.proposedCatKey, colonyConfidence: record.colonyConfidence,
    count: record.count, feedingConfirmed: record.feedingConfirmed, flags: [...new Set(record.flags)].sort(), duplicateGroup: record.duplicateGroup };
}
async function fingerprint(record) { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(sourcePayload(record)))); return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join(""); }
function statement(db, sql, ...args) { return db.prepare(sql).bind(...args); }
async function rows(db, sql, ...args) { return (await statement(db, sql, ...args).all()).results ?? []; }
async function identities(db, items) { if (!items.length) return new Map(); const list = await rows(db, `SELECT i.*,m.trace_id FROM intake_source_identities i LEFT JOIN intake_source_messages m ON m.id=i.source_message_id WHERE source_key IN (${items.map(() => "?").join(",")})`, ...items.map(item => item.key)); return new Map(list.map(row => [row.source_key, row])); }
function existingPayload(row) {
  if (!row.observation_id) throw identityError("Stored legacy evidence is incomplete; review it before retrying this source.");
  let flags, attachments;
  try { flags = JSON.parse(row.raw_fixture_json).flags ?? []; attachments = JSON.parse(row.attachment_manifest_json); } catch { throw identityError("Stored legacy evidence cannot be verified; no original records were changed."); }
  return { id: row.source_record_id, sourceKind: row.source_kind, volunteerAlias: row.volunteer_alias, receivedAt: row.received_at, broadArea: row.broad_area, text: row.body_redacted,
    attachments, proposedColonyKey: row.proposed_colony_key, proposedCatKey: row.proposed_cat_key, colonyConfidence: row.colony_confidence,
    count: row.source_count_low == null ? null : { low: row.source_count_low, high: row.source_count_high, confidence: row.source_count_confidence },
    feedingConfirmed: Boolean(row.source_feeding_confirmed), flags: flags.filter(flag => flag !== "agent_urgent"), duplicateGroup: row.duplicate_group };
}
async function legacyRows(db, family, batchId) {
  const predicates = family.kinds ? family.aliases.map(() => "(m.batch_id=? OR m.batch_id=?||'-'||m.source_message_id)") : ["m.batch_id=?"];
  const args = family.kinds ? family.aliases.flatMap(alias => [alias, alias]) : [batchId];
  return rows(db, `SELECT m.*,m.source_message_id AS source_record_id,o.id AS observation_id,o.proposed_cat_key,o.proposed_colony_key,o.colony_confidence,o.duplicate_group,o.source_count_low,o.source_count_high,o.source_count_confidence,o.source_feeding_confirmed,o.created_at AS observation_created_at FROM intake_source_messages m LEFT JOIN intake_observations o ON o.source_message_id=m.id WHERE ${predicates.join(" OR ")} ORDER BY o.created_at,m.id`, ...args);
}
async function claimSources(db, batch) {
  const family = familyFor(batch), token = crypto.randomUUID(), at = new Date().toISOString();
  const until = new Date(Date.now() + 15 * 60_000).toISOString();
  const items = await Promise.all(batch.records.map(async record => ({ record, key: JSON.stringify([family.name, record.sourceKind, record.id]), hash: await fingerprint(record) })));
  let stored = await identities(db, items);
  const missing = items.filter(item => !stored.has(item.key));
  const historical = missing.length ? await legacyRows(db, family, batch.batchId) : [];
  const adopted = [];
  for (const item of items) {
    const current = stored.get(item.key);
    if (current && current.payload_sha256 !== item.hash) throw identityError(`Source ${item.record.id} conflicts with its stored original. Submit a separate follow-up report instead.`);
    if (current) continue;
    const candidates = historical.filter(row => row.source_record_id === item.record.id);
    if (!candidates.length) continue;
    for (const row of candidates) if (await fingerprint(existingPayload(row)) !== item.hash) throw identityError(`Source ${item.record.id} conflicts with legacy evidence. Original records and decisions were preserved.`);
    adopted.push(statement(db, "INSERT INTO intake_source_identities (source_key,fixture_family,source_kind,source_record_id,payload_sha256,state,source_message_id,created_at,stored_at) VALUES (?,?,?,?,?,'stored',?,?,?) ON CONFLICT(source_key) DO NOTHING", item.key, family.name, item.record.sourceKind, item.record.id, item.hash, candidates[0].id, at, at));
  }
  if (adopted.length) { await db.batch(adopted); stored = await identities(db, items); }
  const fresh = items.filter(item => stored.get(item.key)?.state !== "stored");
  for (const item of items) if (stored.has(item.key) && stored.get(item.key).payload_sha256 !== item.hash) throw identityError(`Source ${item.record.id} conflicts with its stored original.`);
  // Claim before inference: an exact concurrent replay never starts a second
  // model call. Expired unfinished claims can be retried with the same payload.
  if (fresh.length) await db.batch(fresh.map(item => statement(db, `INSERT INTO intake_source_identities (source_key,fixture_family,source_kind,source_record_id,payload_sha256,state,claim_token,claim_until,created_at)
    VALUES (?,?,?,?,?,'pending',?,?,?) ON CONFLICT(source_key) DO UPDATE SET claim_token=excluded.claim_token,claim_until=excluded.claim_until
    WHERE intake_source_identities.state='pending' AND intake_source_identities.claim_until<? AND intake_source_identities.payload_sha256=excluded.payload_sha256`, item.key, family.name, item.record.sourceKind, item.record.id, item.hash, token, until, at, at)));
  stored = await identities(db, items);
  if (items.some(item => stored.get(item.key)?.payload_sha256 !== item.hash)) { await releaseClaims(db, token); throw identityError("A conflicting source payload was submitted concurrently. Original evidence was preserved."); }
  if (fresh.some(item => stored.get(item.key)?.state === "pending" && stored.get(item.key)?.claim_token !== token)) { await releaseClaims(db, token); throw identityError("Another import is processing this source. Retry after it completes; no duplicate records were added.", "IMPORT_IN_PROGRESS"); }
  return { items, fresh: items.filter(item => stored.get(item.key)?.state === "pending" && stored.get(item.key)?.claim_token === token), token };
}
async function releaseClaims(db, token) { await statement(db, "DELETE FROM intake_source_identities WHERE state='pending' AND claim_token=?", token).run(); }

/** Only the current source-claim owner can create evidence and reviews. */
async function persistClaimedImport(db, prepared, claims) {
  const statements = [];
  const guard = "EXISTS (SELECT 1 FROM intake_source_identities WHERE source_key=? AND state='pending' AND claim_token=?)";
  const byId = new Map(claims.fresh.map(item => [item.record.id, item]));
  statements.push(statement(db, "INSERT INTO intake_import_batches (id,source_kind,provenance,fixture_only,status,record_count,checksum,created_at,source_digest) VALUES (?,?,?,1,'processed',0,?,?,?) ON CONFLICT(id) DO NOTHING", prepared.batch.batchId, prepared.batch.sourceKind, prepared.batch.provenance, prepared.batch.checksum, prepared.batch.importedAt, prepared.batch.sourceDigest ?? null));
  for (const message of prepared.messages) {
    const item = byId.get(message.id), args = [item.key, claims.token];
    statements.push(statement(db, `INSERT INTO intake_source_messages (id,batch_id,source_message_id,trace_id,source_kind,volunteer_alias,body_redacted,broad_area,attachment_manifest_json,received_at,raw_fixture_json) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE ${guard}`,
      message.messageId, prepared.batch.batchId, message.id, message.traceId, message.sourceKind, message.volunteerAlias, message.text, message.broadArea, JSON.stringify(message.attachments), message.receivedAt, JSON.stringify({ synthetic: true, flags: message.flags, fixturePathOnly: true }), ...args));
    statements.push(statement(db, `INSERT INTO intake_observations (id,source_message_id,proposed_cat_key,proposed_colony_key,colony_confidence,duplicate_group,urgency,uncertainty_note,requires_human_confirmation,created_at,assigned_colony_key,assignment_state,source_count_low,source_count_high,source_count_confidence,source_feeding_confirmed) SELECT ?,?,?,?,?,?,?,?,1,?,?,?,?,?,?,? WHERE ${guard}`,
      message.observationId, message.messageId, message.proposedCatKey, message.proposedColonyKey, message.colonyConfidence, message.duplicateGroup, message.urgency, message.uncertaintyNote, prepared.batch.importedAt, message.assignedColonyKey, message.assignmentState, message.count?.low ?? null, message.count?.high ?? null, message.count?.confidence ?? null, message.feedingConfirmed ? 1 : 0, ...args));
    const assessment = prepared.assessments?.[message.id];
    if (assessment) statements.push(statement(db, `INSERT INTO intake_assessments (observation_id,mode,summary,evidence_json,created_at) SELECT ?,?,?,?,? WHERE ${guard}`, message.observationId, assessment.mode ?? "unknown", assessment.summary ?? "", JSON.stringify(assessment.matchEvidence ?? {}), prepared.batch.importedAt, ...args));
    if (message.count && message.proposedColonyKey) statements.push(statement(db, `INSERT INTO colony_census_events (id,observation_id,colony_key,reported_count_low,reported_count_high,count_confidence,fixed_delta,tnr_pending_delta,medical_case_delta,event_at) SELECT ?,?,?,?,?,?,0,0,?,? WHERE ${guard}`, `CENSUS:${message.traceId}`, message.observationId, message.proposedColonyKey, message.count.low, message.count.high, message.count.confidence, message.urgency === "urgent" ? 1 : 0, message.receivedAt, ...args));
    if (message.feedingConfirmed && message.proposedColonyKey) statements.push(statement(db, `INSERT INTO feeder_visit_log (id,source_message_id,colony_key,feeder_alias,feeding_confirmed,headcount,visited_at) SELECT ?,?,?,?,1,?,? WHERE ${guard}`, `FEED:${message.traceId}`, message.messageId, message.proposedColonyKey, message.volunteerAlias, message.count?.high ?? null, message.receivedAt, ...args));
    for (const review of message.review) statements.push(statement(db, `INSERT INTO intake_review_queue (id,observation_id,review_kind,status,explanation,created_at) SELECT ?,?,?,'open',?,? WHERE ${guard}`, review.id, message.observationId, review.kind, review.explanation, prepared.batch.importedAt, ...args));
    statements.push(statement(db, `UPDATE intake_source_identities SET state='stored',source_message_id=?,stored_at=?,claim_until=NULL WHERE source_key=? AND state='pending' AND claim_token=? AND EXISTS(SELECT 1 FROM intake_source_messages WHERE id=?)`, message.messageId, prepared.batch.importedAt, item.key, claims.token, message.messageId));
  }
  statements.push(statement(db, "UPDATE intake_import_batches SET record_count=(SELECT COUNT(*) FROM intake_source_messages WHERE batch_id=?) WHERE id=?", prepared.batch.batchId, prepared.batch.batchId));
  await db.batch(statements);
  return { persisted: true, statementCount: statements.length };
}

/** Import once per original source, regardless of bulk/replay delivery mode. */
export async function importSyntheticFixture({ db, fixture, now, assessments = {}, assessRecord, sourceDigest } = {}) {
  const batch = validateSyntheticFixtureBatch(fixture);
  familyFor(batch);
  if (!db) { const prepared = prepareSyntheticImport(batch, { now, assessments }); return { persisted: false, reason: "No D1 binding supplied; prepared only.", ...prepared.summary, traceIds: prepared.messages.map(message => message.traceId), prepared }; }
  if (!db.batch) error("atomic D1 batch support is required");
  const claims = await claimSources(db, batch);
  try {
    const selectedAssessments = {};
    for (const { record } of claims.fresh) selectedAssessments[record.id] = assessRecord ? await assessRecord(structuredClone(record)) : assessments[record.id];
    const freshBatch = { ...batch, records: claims.fresh.map(item => item.record) };
    const threshold = await readRoutingThreshold(db);
    const prepared = claims.fresh.length ? prepareSyntheticImport(freshBatch, { now, colonyMatchThreshold: threshold, assessments: selectedAssessments }) : { batch: { ...batch, importedAt: now ?? new Date().toISOString() }, messages: [] };
    prepared.assessments = selectedAssessments;
    prepared.batch.sourceDigest = sourceDigest;
    const persistence = claims.fresh.length ? await persistClaimedImport(db, prepared, claims) : { persisted: true, statementCount: 0 };
    const after = await identities(db, claims.items);
    if (claims.items.some(item => after.get(item.key)?.state !== "stored")) throw identityError("Source ownership changed while importing. Retry; committed originals were preserved.", "IMPORT_IN_PROGRESS");
    const importedIds = new Set(claims.fresh.filter(item => after.get(item.key)?.claim_token === claims.token).map(item => item.record.id));
    const importedMessages = prepared.messages.filter(message => importedIds.has(message.id));
    const traces = claims.items.map(item => after.get(item.key).trace_id);
    const modeRows = await rows(db, `SELECT a.mode FROM intake_source_identities i JOIN intake_observations o ON o.source_message_id=i.source_message_id JOIN intake_assessments a ON a.observation_id=o.id WHERE i.source_key IN (${claims.items.map(() => "?").join(",")})`, ...claims.items.map(item => item.key));
    return { ...persistence, ...sponsorSafeRollup({ batch, messages: importedMessages }), batchId: batch.batchId, reportsImported: importedMessages.length, reportsRequested: batch.records.length, reportsSkipped: batch.records.length - importedMessages.length,
      duplicate: importedMessages.length === 0, traceIds: traces, importedTraceIds: importedMessages.map(message => message.traceId), modes: [...new Set(modeRows.map(row => row.mode))], prepared };
  } catch (error) { await releaseClaims(db, claims.token); throw error; }
}

/** Backward-compatible prepared-input entry point; it uses the same identity gate. */
export async function persistSyntheticImport(db, prepared) { return importSyntheticFixture({ db, fixture: prepared.batch, now: prepared.batch.importedAt, assessments: prepared.assessments, sourceDigest: prepared.batch.sourceDigest }); }

/** A privacy-safe aggregate suitable for a demo sponsor/city view. */
export function sponsorSafeRollup({ batch, messages }) {
  const uniqueCats = new Set(messages.map((message) => message.proposedCatKey).filter(Boolean));
  const reviewKinds = messages.flatMap((message) => message.review.map((review) => review.kind));
  return {
    synthetic: true, batchId: batch.batchId, checksum: batch.checksum ?? stableChecksum(batch), reportsImported: messages.length,
    broadAreasCovered: [...new Set(messages.map((message) => message.broadArea))].sort(),
    observedCatRecords: uniqueCats.size, urgentReviews: reviewKinds.filter((kind) => kind === "urgent_care").length,
    duplicateReviews: reviewKinds.filter((kind) => kind === "possible_duplicate").length,
    feederVisits: messages.filter((message) => message.feedingConfirmed).length,
    pendingTnrReviews: reviewKinds.filter((kind) => kind === "new_cat").length,
    disclaimer: "Synthetic aggregate only. Omits names, contacts, precise locations, raw photos, and operational routes.",
  };
}
