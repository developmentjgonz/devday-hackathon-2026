/** Confidence-gated colony routing, clarification, and human verification.
 * Source messages and source counts are never changed by this module. */

const MANAGERS = new Set(["admin", "coordinator"]);
const READERS = new Set(["admin", "coordinator", "volunteer"]);
function fail(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
function currentUser(session) { const user = session?.user; if (!user || !Number.isInteger(Number(user.id)) || !READERS.has(user.role)) fail("Authorized internal session required", user?.role === "sponsor" ? 403 : 401); return { id: Number(user.id), role: user.role }; }
function manager(session) { const user = currentUser(session); if (!MANAGERS.has(user.role)) fail("Coordinator or admin access required", 403); return user; }
function safeId(value, label) { const output = String(value ?? "").trim(); if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(output) || output.length > 160) fail(`Invalid ${label}`); return output; }
function copy(value, label, max = 1200) { const output = String(value ?? "").trim(); if (!output || output.length > max) fail(`Invalid ${label}`); return output; }
function optionalUserId(value) { if (value == null || value === "") return null; const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < 1) fail("Invalid assigned volunteer"); return parsed; }
function count(value, label) { if (value == null || String(value).trim() === "") fail(`Invalid ${label}`); const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < 0 || parsed > 200) fail(`Invalid ${label}`); return parsed; }
function confidence(value) { if (value == null || String(value).trim() === "") fail("Invalid count confidence"); const parsed = Number(value); if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) fail("Invalid count confidence"); return parsed; }
function threshold(value) { const parsed = Number(value); if (!Number.isFinite(parsed) || parsed < .5 || parsed > .95) fail("Routing threshold must be between 0.50 and 0.95"); return Math.round(parsed * 100) / 100; }
function uuid(prefix = "confirm") { return crypto.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function statement(db, sql, ...params) { if (!db?.prepare) fail("Database unavailable", 503); return db.prepare(sql).bind(...params); }
async function first(db, sql, ...params) { return (await statement(db, sql, ...params).first()) ?? null; }
async function all(db, sql, ...params) { const result = await statement(db, sql, ...params).all(); return result.results ?? result ?? []; }
function changed(result) { return Number(result?.meta?.changes ?? 0); }
function present(row) { return { observation_id: row.observation_id, source_message_id: row.source_message_id, source_kind: row.source_kind, volunteer_alias: row.volunteer_alias, body_redacted: row.body_redacted, broad_area: row.broad_area, received_at: row.received_at, proposed_colony_key: row.proposed_colony_key, assigned_colony_key: row.assigned_colony_key, assignment_state: row.assignment_state, colony_confidence: Number(row.colony_confidence), source_count: row.source_count_low == null ? null : { low: row.source_count_low, high: row.source_count_high, confidence: row.source_count_confidence }, verified_count: row.verified_count_low == null ? null : { low: row.verified_count_low, high: row.verified_count_high, confidence: row.verified_count_confidence }, verification_evidence: row.verification_evidence, verified_at: row.verified_at, clarification: row.clarification_id ? { id: row.clarification_id, state: row.clarification_state, request_message: row.request_message, reply_message: row.reply_message, reply_evidence: row.reply_evidence, assigned_user_id: row.assigned_user_id, requested_at: row.requested_at, replied_at: row.replied_at } : null }; }

/** Internal import helper. Does not require HTTP auth and safely defaults during first migration. */
export async function readRoutingThreshold(db) {
  try { const row = await first(db, "SELECT value_real FROM rescue_settings WHERE setting_key='colony_match_threshold'"); return threshold(row?.value_real ?? .75); } catch { return .75; }
}

export async function getRoutingSettings({ db, session }) {
  currentUser(session);
  return { colony_match_threshold: await readRoutingThreshold(db), applies_to: "Future imports and existing automatic/unmatched suggestions. Human-confirmed assignments remain unchanged." };
}

export async function setRoutingSettings({ db, session, input, now = new Date().toISOString() }) {
  const user = manager(session); if (!db?.batch) fail("Atomic database updates are required", 503); const value = threshold(input?.colonyMatchThreshold);
  // The threshold never overwrites a human confirmation. It reclassifies only
  // suggestions so a lower threshold can surface them as automatic routes later.
  const setting = statement(db, "INSERT INTO rescue_settings (setting_key,value_real,updated_by,updated_at) VALUES ('colony_match_threshold',?,?,?) ON CONFLICT(setting_key) DO UPDATE SET value_real=excluded.value_real,updated_by=excluded.updated_by,updated_at=excluded.updated_at", value, user.id, now);
  const rebalance = statement(db, "UPDATE intake_observations SET assigned_colony_key=CASE WHEN proposed_colony_key IS NOT NULL AND colony_confidence>=? THEN proposed_colony_key ELSE NULL END, assignment_state=CASE WHEN proposed_colony_key IS NOT NULL AND colony_confidence>=? THEN 'auto' ELSE 'unmatched' END WHERE assignment_state IN ('auto','unmatched')", value, value);
  const audit = statement(db, "INSERT INTO intake_confirmation_events (id,observation_id,actor_id,action,summary,created_at) VALUES (?,?,?,'routing_threshold_updated',?,?)", uuid("setting"), null, user.id, `Colony match threshold set to ${value.toFixed(2)}; existing suggestions re-evaluated and confirmations preserved.`, now);
  await db.batch([setting, rebalance, audit]);
  return { colony_match_threshold: value, applies_to: "Future imports and existing automatic/unmatched suggestions. Human-confirmed assignments remain unchanged." };
}

export async function listIntakeReview({ db, session }) {
  const user = currentUser(session);
  const ownClarification = user.role === "volunteer";
  // Volunteers see their own latest assigned clarification, rather than a newer
  // clarification assigned to somebody else for the same observation.
  const clarificationJoin = ownClarification
    ? "LEFT JOIN intake_clarifications c ON c.id=(SELECT c2.id FROM intake_clarifications c2 WHERE c2.observation_id=o.id AND c2.assigned_user_id=? ORDER BY c2.requested_at DESC LIMIT 1)"
    : "LEFT JOIN intake_clarifications c ON c.id=(SELECT c2.id FROM intake_clarifications c2 WHERE c2.observation_id=o.id ORDER BY c2.requested_at DESC LIMIT 1)";
  const rows = await all(db, `SELECT o.id AS observation_id,o.source_message_id,o.proposed_colony_key,o.assigned_colony_key,o.assignment_state,o.colony_confidence,o.source_count_low,o.source_count_high,o.source_count_confidence,o.verified_count_low,o.verified_count_high,o.verified_count_confidence,o.verification_evidence,o.verified_at,m.source_kind,m.volunteer_alias,m.body_redacted,m.broad_area,m.received_at,c.id AS clarification_id,c.state AS clarification_state,c.request_message,c.reply_message,c.reply_evidence,c.assigned_user_id,c.requested_at,c.replied_at FROM intake_observations o JOIN intake_source_messages m ON m.id=o.source_message_id ${clarificationJoin} ${ownClarification ? "WHERE c.id IS NOT NULL" : ""} ORDER BY CASE o.assignment_state WHEN 'unmatched' THEN 0 WHEN 'auto' THEN 1 ELSE 2 END,o.created_at DESC LIMIT 200`, ...(ownClarification ? [user.id] : []));
  return { reviews: rows.map(present), role: user.role, colony_match_threshold: await readRoutingThreshold(db), disclaimer: "Source messages and reported counts are retained as submitted. Automatic routes are suggestions; only a coordinator or admin can confirm a colony or count." };
}

export async function requestClarification({ db, session, input, now = new Date().toISOString() }) {
  const user = manager(session); if (!db?.batch) fail("Atomic database updates are required", 503); const observationId = safeId(input?.observationId, "observation ID"); const message = copy(input?.message, "clarification request", 700); const assignee = optionalUserId(input?.assignedUserId);
  if (assignee !== null) { const volunteer = await first(db, "SELECT id FROM users WHERE id=? AND role='volunteer' AND disabled_at IS NULL", assignee); if (!volunteer) fail("Assigned volunteer is unavailable", 409); }
  const clarificationId = uuid("clarify");
  const insert = statement(db, "INSERT INTO intake_clarifications (id,observation_id,requested_by,assigned_user_id,request_message,requested_at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM intake_observations WHERE id=?)", clarificationId, observationId, user.id, assignee, message, now, observationId);
  const audit = statement(db, "INSERT INTO intake_confirmation_events (id,observation_id,clarification_id,actor_id,action,summary,created_at) SELECT ?,?,?,?,'clarification_requested',?,? WHERE EXISTS (SELECT 1 FROM intake_clarifications WHERE id=?)", uuid("event"), observationId, clarificationId, user.id, assignee === null ? "Coordinator requested clarification; no volunteer is assigned yet." : "Coordinator requested clarification from an assigned volunteer.", now, clarificationId);
  const results = await db.batch([insert, audit]); if (changed(results?.[0]) !== 1) fail("Observation is unavailable", 404);
  return { id: clarificationId, observation_id: observationId, state: "open", assigned_user_id: assignee, requested_at: now };
}

export async function replyClarification({ db, session, input, now = new Date().toISOString() }) {
  const user = currentUser(session); if (!db?.batch) fail("Atomic database updates are required", 503); const clarificationId = safeId(input?.id, "clarification ID"); const reply = copy(input?.reply, "clarification reply", 900); const evidence = copy(input?.evidence, "clarification evidence", 900); const isManager = MANAGERS.has(user.role) ? 1 : 0;
  const update = statement(db, "UPDATE intake_clarifications SET state='replied',reply_message=?,reply_evidence=?,replied_by=?,replied_at=? WHERE id=? AND state='open' AND (?=1 OR assigned_user_id=?)", reply, evidence, user.id, now, clarificationId, isManager, user.id);
  const audit = statement(db, "INSERT INTO intake_confirmation_events (id,observation_id,clarification_id,actor_id,action,summary,created_at) SELECT ?,observation_id,?,?,'clarification_replied','Clarification reply and evidence recorded.',? FROM intake_clarifications WHERE id=? AND changes()=1", uuid("event"), clarificationId, user.id, now, clarificationId);
  const results = await db.batch([update, audit]); if (changed(results?.[0]) !== 1) fail("Clarification is unavailable, already answered, or not assigned to you", 409);
  return { id: clarificationId, state: "replied", replied_at: now };
}

export async function confirmObservation({ db, session, input, now = new Date().toISOString() }) {
  const user = manager(session); if (!db?.batch) fail("Atomic database updates are required", 503); const observationId = safeId(input?.observationId, "observation ID"); const colonyKey = safeId(input?.assignedColonyKey, "assigned colony"); const low = count(input?.countLow, "verified lower count"); const high = count(input?.countHigh, "verified upper count"); if (high < low) fail("Verified upper count cannot be below lower count"); const countConfidence = confidence(input?.countConfidence); const evidence = copy(input?.evidence, "verification evidence", 1200);
  // A person may affirm the observation's own proposed key even before that key
  // appears in canonical materialization; otherwise the target must already exist.
  const auditEventId = uuid("event");
  const update = statement(db, "UPDATE intake_observations SET assigned_colony_key=?,assignment_state='confirmed',verified_count_low=?,verified_count_high=?,verified_count_confidence=?,verification_evidence=?,verified_by=?,verified_at=? WHERE id=? AND (proposed_colony_key=? OR EXISTS (SELECT 1 FROM canonical_colonies WHERE colony_key=?))", colonyKey, low, high, countConfidence, evidence, user.id, now, observationId, colonyKey, colonyKey);
  const audit = statement(db, "INSERT INTO intake_confirmation_events (id,observation_id,actor_id,action,summary,created_at) SELECT ?,id,?,'observation_confirmed',?,? FROM intake_observations WHERE id=? AND assignment_state='confirmed' AND verified_at=? AND changes()=1", auditEventId, user.id, `Human confirmed colony ${colonyKey} and verified count ${low}-${high}.`, now, observationId, now);
  // Each follow-up is tied to the audit row created by this exact successful
  // confirmation, so a rejected target cannot alter open clarification work.
  const resolve = statement(db, "UPDATE intake_clarifications SET state='resolved',resolved_at=? WHERE observation_id=? AND state IN ('open','replied') AND EXISTS (SELECT 1 FROM intake_confirmation_events WHERE id=?)", now, observationId, auditEventId);
  const closeUncertainCount = statement(db, "UPDATE intake_review_queue SET status='confirmed',resolved_at=? WHERE observation_id=? AND review_kind='uncertain_count' AND status='open' AND EXISTS (SELECT 1 FROM intake_confirmation_events WHERE id=?)", now, observationId, auditEventId);
  const results = await db.batch([update, audit, resolve, closeUncertainCount]); if (changed(results?.[0]) !== 1) fail("Observation is unavailable or the colony is not an allowed confirmation target", 409);
  return { observation_id: observationId, assigned_colony_key: colonyKey, assignment_state: "confirmed", verified_count: { low, high, confidence: countConfidence }, verified_at: now };
}
