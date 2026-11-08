/** Persisted, fictional-only community review leads. Raw content is intentionally never stored. */
const AREAS = new Set(["Miami-Dade", "Miami Beach", "Hialeah / Miami-Dade", "Homestead / Miami-Dade", "Fort Lauderdale / Broward", "Hollywood / Broward", "South Florida area pending review"]);
const ROLES = new Set(["admin", "coordinator", "volunteer"]); const MANAGERS = new Set(["admin", "coordinator"]);
function fail(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
function user(session) { const current = session?.user; if (!current || !Number.isInteger(Number(current.id)) || !ROLES.has(current.role)) fail("Authorized coordinator or volunteer session required", current?.role === "sponsor" ? 403 : 401); return { id: Number(current.id), role: current.role }; }
function manager(session) { const current = user(session); if (!MANAGERS.has(current.role)) fail("Coordinator or admin access required", 403); return current; }
function id(value, label) { const output = String(value ?? "").trim(); if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(output) || output.length > 160) fail(`Invalid ${label}`); return output; }
function uuid() { return crypto.randomUUID?.() ?? `community-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function stmt(db, sql, ...params) { if (!db?.prepare) fail("Database unavailable", 503); return db.prepare(sql).bind(...params); }
async function all(db, sql, ...params) { const result = await stmt(db, sql, ...params).all(); return result.results ?? result ?? []; }
function forbidden(value) { const text = String(value ?? ""); return /\b-?\d{1,2}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}\b/.test(text); }
function controlledAssessment(input) {
  if (!input || typeof input !== "object" || input.fictionalOnly !== true) fail("Only an explicitly fictional hackathon signal can be queued");
  const assessment = input.assessment; if (!assessment || typeof assessment !== "object") fail("A completed safe assessment is required");
  if (forbidden(JSON.stringify(assessment))) fail("Exact coordinates cannot be queued");
  const classification = ["missing-cat", "colony-lead", "not-actionable"].includes(assessment.classification) ? assessment.classification : null; if (!classification) fail("Invalid assessment classification");
  const broadArea = assessment.area == null ? null : String(assessment.area).trim(); if (broadArea && !AREAS.has(broadArea)) fail("Assessment must use a supported broad area");
  const mode = ["agent", "fallback", "demo"].includes(assessment.mode) ? assessment.mode : "demo";
  // Deliberately ignore agent title/summary and all original source text. Stored text is controlled server copy only.
  const title = classification === "missing-cat" ? "Fictional possible missing-cat lead" : classification === "colony-lead" ? "Fictional possible community-colony lead" : "Fictional signal needs clarification";
  const safeSummary = classification === "missing-cat" ? "A fictional, authorized signal may describe a missing cat. A coordinator must verify the source and use a safe platform path before any case or public notice." : classification === "colony-lead" ? "A fictional, authorized signal may describe a community-cat group. A verified volunteer must confirm it before any colony, map point, or assignment is created." : "The fictional signal does not contain enough safe information for a case. No cat or colony record was created.";
  return { classification, broadArea, mode, title, safeSummary };
}
function present(row) { return { id: row.id, classification: row.classification, broad_area: row.broad_area, assessment_mode: row.assessment_mode, title: row.title, summary: row.safe_summary, status: row.status, created_at: row.created_at, decided_at: row.decided_at }; }

export async function listCommunityReviews({ db, session }) {
  const current = user(session); const rows = await all(db, `SELECT id,classification,broad_area,assessment_mode,title,safe_summary,status,created_at,decided_at FROM community_reviews ${current.role === "volunteer" ? "WHERE created_by=?" : ""} ORDER BY created_at DESC LIMIT 150`, ...(current.role === "volunteer" ? [current.id] : []));
  return { reviews: rows.map(present), scope: current.role === "volunteer" ? "own" : "all", disclaimer: "Fictional review leads only. Raw posts, contacts, precise locations, and photos are not retained." };
}

export async function createCommunityReview({ db, session, input, now = new Date().toISOString() }) {
  const current = user(session); const safe = controlledAssessment(input); const reviewId = uuid(); const eventId = uuid();
  const insert = stmt(db, "INSERT INTO community_reviews (id,created_by,classification,broad_area,assessment_mode,title,safe_summary,status,fictional_only,created_at) VALUES (?,?,?,?,?,?,?,'queued',1,?)", reviewId, current.id, safe.classification, safe.broadArea, safe.mode, safe.title, safe.safeSummary, now);
  const audit = stmt(db, "INSERT INTO community_review_events (id,review_id,actor_id,action,summary,created_at) VALUES (?,?,?,'created','Fictional review lead staged',?)", eventId, reviewId, current.id, now);
  const results = db.batch ? await db.batch([insert, audit]) : [await insert.run(), await audit.run()]; if (Number(results?.[0]?.meta?.changes ?? 0) !== 1) fail("Unable to queue review", 409);
  return { id: reviewId, ...safe, status: "queued", created_at: now };
}

export async function updateCommunityReview({ db, session, input, now = new Date().toISOString() }) {
  const current = manager(session); if (!db?.batch) fail("Atomic database updates are required", 503); const reviewId = id(input?.id, "review ID"); const decision = input?.decision; if (!["verified", "dismissed"].includes(decision)) fail("Decision must be verified or dismissed");
  const update = stmt(db, "UPDATE community_reviews SET status=?,decided_by=?,decided_at=? WHERE id=? AND status='queued'", decision, current.id, now, reviewId);
  const audit = stmt(db, "INSERT INTO community_review_events (id,review_id,actor_id,action,summary,created_at) SELECT ?,id,?,?,?,? FROM community_reviews WHERE id=? AND status=? AND decided_at=?", uuid(), current.id, decision, decision === "verified" ? "Coordinator verified fictional lead; no canonical record was auto-created." : "Coordinator dismissed fictional lead; no canonical record was created.", now, reviewId, decision, now);
  const results = await db.batch([update, audit]); if (Number(results?.[0]?.meta?.changes ?? 0) !== 1) fail("Review is missing or already decided", 409);
  return { id: reviewId, status: decision, decided_at: now };
}
