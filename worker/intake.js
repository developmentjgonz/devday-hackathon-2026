/**
 * Fixture-only import service for the hackathon demo.
 *
 * It deliberately rejects real/live sources, raw coordinates, phone numbers,
 * email addresses and non-demo attachments. Calls to this module must remain
 * behind an authenticated coordinator-only route when an API route is added.
 */

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
    if (count && count.high < count.low) error("count.high must not be below count.low");
    return {
      id, sourceKind: recordSource, volunteerAlias: string(raw.volunteerAlias, 100, "record.volunteerAlias"),
      receivedAt: string(raw.receivedAt, 64, "record.receivedAt"), broadArea, text: redacted(text), attachments,
      proposedColonyKey: raw.proposedColonyKey ? safeId(raw.proposedColonyKey, "record.proposedColonyKey") : null,
      proposedCatKey: raw.proposedCatKey ? safeId(raw.proposedCatKey, "record.proposedCatKey") : null,
      colonyConfidence: confidence(raw.colonyConfidence, .5), count, feedingConfirmed: Boolean(raw.feedingConfirmed),
      flags: Array.isArray(raw.flags) ? raw.flags.map((flag) => safeId(String(flag), "record.flag").toLowerCase()).slice(0, 8) : [],
      duplicateGroup: raw.duplicateGroup ? safeId(raw.duplicateGroup, "record.duplicateGroup") : null,
    };
  });
  return { schemaVersion: Number(input.schemaVersion) || 1, synthetic: true, batchId, sourceKind, provenance, records };
}

export function prepareSyntheticImport(input, { now = new Date().toISOString() } = {}) {
  const batch = validateSyntheticFixtureBatch(input);
  const checksum = stableChecksum(batch);
  const messages = batch.records.map((record) => {
    const urgency = urgencyFrom(record);
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
      uncertaintyNote: record.count && record.count.low !== record.count.high ? `Reported range: ${record.count.low}-${record.count.high}; confidence ${record.count.confidence}.` : null,
    };
  });
  return { batch: { ...batch, checksum, importedAt: now }, messages, summary: sponsorSafeRollup({ batch, messages }) };
}

/** Persist a prepared synthetic import against a Cloudflare D1 binding. */
export async function persistSyntheticImport(db, prepared) {
  if (!db?.prepare) error("a D1 binding is required for persistence");
  const statements = [];
  statements.push(db.prepare("INSERT INTO intake_import_batches (id, source_kind, provenance, fixture_only, status, record_count, checksum, created_at, source_digest) VALUES (?, ?, ?, 1, 'processed', ?, ?, ?, ?)")
    .bind(prepared.batch.batchId, prepared.batch.sourceKind, prepared.batch.provenance, prepared.messages.length, prepared.batch.checksum, prepared.batch.importedAt, prepared.batch.sourceDigest ?? null));
  for (const message of prepared.messages) {
    statements.push(db.prepare("INSERT INTO intake_source_messages (id, batch_id, source_message_id, trace_id, source_kind, volunteer_alias, body_redacted, broad_area, attachment_manifest_json, received_at, raw_fixture_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(message.messageId, prepared.batch.batchId, message.id, message.traceId, message.sourceKind, message.volunteerAlias, message.text, message.broadArea, JSON.stringify(message.attachments), message.receivedAt, JSON.stringify({ synthetic: true, flags: message.flags, fixturePathOnly: true })));
    statements.push(db.prepare("INSERT INTO intake_observations (id, source_message_id, proposed_cat_key, proposed_colony_key, colony_confidence, duplicate_group, urgency, uncertainty_note, requires_human_confirmation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)")
      .bind(message.observationId, message.messageId, message.proposedCatKey, message.proposedColonyKey, message.colonyConfidence, message.duplicateGroup, message.urgency, message.uncertaintyNote, prepared.batch.importedAt));
    const assessment = prepared.assessments?.[message.id];
    if (assessment) statements.push(db.prepare("INSERT INTO intake_assessments (observation_id, mode, summary, evidence_json, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(message.observationId, assessment.mode ?? "unknown", assessment.summary ?? "", JSON.stringify(assessment.matchEvidence ?? {}), prepared.batch.importedAt));
    if (message.count && message.proposedColonyKey) statements.push(db.prepare("INSERT INTO colony_census_events (id, observation_id, colony_key, reported_count_low, reported_count_high, count_confidence, fixed_delta, tnr_pending_delta, medical_case_delta, event_at) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)")
      .bind(`CENSUS:${message.traceId}`, message.observationId, message.proposedColonyKey, message.count.low, message.count.high, message.count.confidence, message.urgency === "urgent" ? 1 : 0, message.receivedAt));
    if (message.feedingConfirmed && message.proposedColonyKey) statements.push(db.prepare("INSERT INTO feeder_visit_log (id, source_message_id, colony_key, feeder_alias, feeding_confirmed, headcount, visited_at) VALUES (?, ?, ?, ?, 1, ?, ?)")
      .bind(`FEED:${message.traceId}`, message.messageId, message.proposedColonyKey, message.volunteerAlias, message.count?.high ?? null, message.receivedAt));
    for (const review of message.review) statements.push(db.prepare("INSERT INTO intake_review_queue (id, observation_id, review_kind, status, explanation, created_at) VALUES (?, ?, ?, 'open', ?, ?)")
      .bind(review.id, message.observationId, review.kind, review.explanation, prepared.batch.importedAt));
  }
  if (db.batch) await db.batch(statements); else await Promise.all(statements.map((statement) => statement.run()));
  return { persisted: true, statementCount: statements.length, batchId: prepared.batch.batchId, checksum: prepared.batch.checksum };
}

/** Validate, transform and optionally persist a synthetic fixture. */
export async function importSyntheticFixture({ db, fixture, now, assessments, sourceDigest } = {}) {
  const prepared = prepareSyntheticImport(fixture, { now });
  prepared.assessments = assessments;
  prepared.batch.sourceDigest = sourceDigest;
  const persistence = db ? await persistSyntheticImport(db, prepared) : { persisted: false, reason: "No D1 binding supplied; prepared only." };
  return { ...persistence, ...prepared.summary, traceIds: prepared.messages.map((message) => message.traceId), prepared };
}

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
