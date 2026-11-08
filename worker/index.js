import { analyzeCommunitySignal, predictLostCatLocation, triageReport } from "./triage-agent.js";
import { allowLoginAttempt, getSession, loginWithPassword, requireRole, requireSameOrigin, revokeCurrentSession, sessionHeaders } from "./auth.js";
import { readPrivatePhoto, reviewPrivatePhoto, uploadPrivatePhoto } from "./photos.js";
import { importSyntheticFixture } from "./intake.js";

const service = "devday-js-2026";

function json(body, status = 200, headers = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

async function readLimitedJson(request, limit) {
  if (Number(request.headers.get("content-length") || 0) > limit || !request.body) throw new Error("Request too large");
  const reader = request.body.getReader(); const chunks = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > limit) { await reader.cancel(); throw new Error("Request too large"); } chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/auth/login") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
      if (!requireSameOrigin(request, env)) return json({ error: "Origin rejected" }, 403);
      if (!(request.headers.get("content-type") ?? "").includes("application/json") || Number(request.headers.get("content-length") || 0) > 2048) return json({ error: "Invalid request" }, 400);
      try {
        const body = await readLimitedJson(request, 2048);
        if (typeof body?.email !== "string" || body.email.length > 254 || typeof body?.password !== "string" || body.password.length > 256) return json({ error: "Invalid credentials" }, 401);
        if (!await allowLoginAttempt(env, request, body.email)) return json({ error: "Sign-in temporarily unavailable" }, 429);
        const session = await loginWithPassword(env, request, body);
        if (!session) return json({ error: "Invalid credentials" }, 401);
        return Response.json({ user: session.user }, { headers: sessionHeaders(session) });
      } catch { return json({ error: "Sign-in unavailable" }, 503); }
    }

    if (pathname === "/api/auth/session") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, { Allow: "GET" });
      const session = await getSession(request, env);
      return session ? json({ user: session.user }) : json({ error: "Authentication required" }, 401);
    }

    if (pathname === "/api/auth/logout") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
      const auth = await requireRole(request, env, ["admin", "coordinator", "volunteer", "sponsor"], { csrf: true });
      if (!auth.ok) return auth.response;
      return Response.json({ ok: true }, { headers: await revokeCurrentSession(request, env) });
    }

    if (pathname === "/api/private/photos" && request.method === "POST") {
      const auth = await requireRole(request, env, ["admin", "coordinator", "volunteer"], { csrf: true });
      if (!auth.ok) return auth.response;
      return uploadPrivatePhoto(request, env, String(auth.session.userId));
    }

    if (pathname === "/api/private/synthetic-import") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
      const auth = await requireRole(request, env, ["admin", "coordinator"], { csrf: true });
      if (!auth.ok) return auth.response;
      if (!(request.headers.get("content-type") ?? "").includes("application/json") || Number(request.headers.get("content-length") || 0) > 250000) return json({ error: "Invalid fixture" }, 400);
      try {
        const result = await importSyntheticFixture({ db: env.DB, fixture: await readLimitedJson(request, 250000) });
        return json({ persisted: result.persisted, batchId: result.batchId, reportsImported: result.reportsImported, traceIds: result.traceIds }, 201);
      } catch (error) {
        const message = String(error?.message ?? "");
        if (message.startsWith("Synthetic intake rejected:")) return json({ error: message }, 400);
        if (/unique constraint/i.test(message)) return json({ error: "This fixture batch is already imported; existing reviews were preserved." }, 409);
        return json({ error: "Import unavailable" }, 503);
      }
    }

    if (pathname === "/api/private/intake") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, { Allow: "GET" });
      const auth = await requireRole(request, env, ["admin", "coordinator", "volunteer"]);
      if (!auth.ok) return auth.response;
      const reports = await env.DB.prepare("SELECT m.trace_id, m.source_kind, m.volunteer_alias, m.body_redacted, m.broad_area, m.received_at, m.attachment_manifest_json, o.id AS observation_id, o.proposed_cat_key, o.proposed_colony_key, o.colony_confidence, o.duplicate_group, o.urgency, o.uncertainty_note FROM intake_source_messages m JOIN intake_observations o ON o.source_message_id = m.id ORDER BY m.received_at DESC LIMIT 100").all();
      const reviews = await env.DB.prepare("SELECT id, review_kind, status, explanation, observation_id FROM intake_review_queue ORDER BY created_at DESC LIMIT 100").all();
      const feedings = await env.DB.prepare("SELECT colony_key, feeder_alias, headcount, visited_at FROM feeder_visit_log ORDER BY visited_at DESC LIMIT 100").all();
      return json({ synthetic: true, reports: reports.results ?? [], reviews: reviews.results ?? [], feedings: feedings.results ?? [] });
    }

    if (pathname === "/api/private/reviews/decision") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
      const auth = await requireRole(request, env, ["admin", "coordinator"], { csrf: true });
      if (!auth.ok) return auth.response;
      try {
        const body = await readLimitedJson(request, 2048);
        if (typeof body?.id !== "string" || body.id.length > 300 || !["confirmed", "kept_separate", "dismissed"].includes(body.decision)) return json({ error: "Invalid review decision" }, 400);
        const timestamp = new Date().toISOString();
        const decisions = await env.DB.batch([
          env.DB.prepare("INSERT INTO intake_review_decisions (id, review_id, decision, actor_id, decided_at) SELECT ?, id, ?, ?, ? FROM intake_review_queue WHERE id = ? AND status = 'open' AND (review_kind = 'possible_duplicate' OR ? != 'kept_separate')").bind(crypto.randomUUID(), body.decision, auth.session.userId, timestamp, body.id, body.decision),
          env.DB.prepare("UPDATE intake_review_queue SET status = ?, resolved_at = ? WHERE id = ? AND status = 'open' AND (review_kind = 'possible_duplicate' OR ? != 'kept_separate')").bind(body.decision, timestamp, body.id, body.decision),
        ]);
        if (!decisions[0].meta?.changes) return json({ error: "Review not found, already decided, or decision not applicable" }, 409);
        return json({ ok: true, decision: body.decision, note: "Decision recorded; no cat records were merged." });
      } catch { return json({ error: "Unable to record decision" }, 400); }
    }

    if (pathname === "/api/private/reports/synthetic.csv") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, { Allow: "GET" });
      const auth = await requireRole(request, env, ["admin", "coordinator", "sponsor"]);
      if (!auth.ok) return auth.response;
      const query = new URL(request.url).searchParams;
      const start = query.get("start") ?? "";
      const end = query.get("end") ?? "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end || !Number.isFinite(Date.parse(`${start}T00:00:00Z`)) || !Number.isFinite(Date.parse(`${end}T00:00:00Z`))) return json({ error: "Use a valid start and end date" }, 400);
      const result = await env.DB.prepare("SELECT m.broad_area, COUNT(*) AS reports, SUM(CASE WHEN o.urgency = 'urgent' THEN 1 ELSE 0 END) AS urgent_reports, SUM(CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END) AS feeding_visits FROM intake_source_messages m JOIN intake_observations o ON o.source_message_id = m.id LEFT JOIN feeder_visit_log f ON f.source_message_id = m.id WHERE substr(m.received_at, 1, 10) BETWEEN ? AND ? GROUP BY m.broad_area ORDER BY m.broad_area").bind(start, end).all();
      const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
      const rows = ["broad_area,reports,urgent_reports,feeding_visits", ...(result.results ?? []).map((row) => [escape(row.broad_area), Number(row.reports), Number(row.urgent_reports), Number(row.feeding_visits)].join(","))];
      return new Response(rows.join("\r\n") + "\r\n", { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "private, no-store", "Content-Disposition": 'attachment; filename="synthetic-community-report.csv"', "X-Content-Type-Options": "nosniff" } });
    }

    if (pathname === "/api/private/feeding-assignments") {
      if (request.method === "GET") {
        const auth = await requireRole(request, env, ["admin", "coordinator", "volunteer"]);
        if (!auth.ok) return auth.response;
        const data = await env.DB.prepare("SELECT id, colony_key, assigned_user_id, due_at, status, completed_at FROM feeding_assignments WHERE (? != 'volunteer' OR assigned_user_id = ?) ORDER BY due_at LIMIT 200").bind(auth.session.user.role, auth.session.userId).all();
        return json({ assignments: (data.results ?? []).map((item) => ({ ...item, overdue: item.status === "scheduled" && Date.parse(item.due_at) < Date.now() })) });
      }
      if (request.method === "POST") {
        const auth = await requireRole(request, env, ["admin", "coordinator"], { csrf: true });
        if (!auth.ok) return auth.response;
        try {
          const input = await readLimitedJson(request, 2048);
          if (typeof input?.colonyKey !== "string" || !/^[A-Za-z0-9-]{1,80}$/.test(input.colonyKey) || !Number.isInteger(input.assignedUserId) || typeof input.dueAt !== "string" || !Number.isFinite(Date.parse(input.dueAt))) return json({ error: "Invalid assignment" }, 400);
          const volunteer = await env.DB.prepare("SELECT id FROM users WHERE id = ? AND role IN ('volunteer', 'coordinator', 'admin') AND disabled_at IS NULL").bind(input.assignedUserId).first();
          if (!volunteer) return json({ error: "Active team member not found" }, 400);
          const id = crypto.randomUUID(); const now = new Date().toISOString();
          await env.DB.batch([
            env.DB.prepare("INSERT INTO feeding_assignments (id, colony_key, assigned_user_id, due_at, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(id, input.colonyKey, input.assignedUserId, new Date(input.dueAt).toISOString(), auth.session.userId, now),
            env.DB.prepare("INSERT INTO field_assignment_events (id, assignment_id, actor_id, action, created_at) VALUES (?, ?, ?, 'created', ?)").bind(crypto.randomUUID(), id, auth.session.userId, now),
          ]);
          return json({ id, status: "scheduled" }, 201);
        } catch { return json({ error: "Unable to create assignment" }, 400); }
      }
      return json({ error: "Method not allowed" }, 405);
    }

    if (pathname === "/api/private/feeding-assignments/update") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
      const auth = await requireRole(request, env, ["admin", "coordinator", "volunteer"], { csrf: true });
      if (!auth.ok) return auth.response;
      try {
        const input = await readLimitedJson(request, 2048);
        if (typeof input?.id !== "string" || !/^[0-9a-f-]{36}$/i.test(input.id) || !["complete", "reassign"].includes(input.action)) return json({ error: "Invalid update" }, 400);
        const existing = await env.DB.prepare("SELECT id, assigned_user_id, status FROM feeding_assignments WHERE id = ?").bind(input.id).first();
        if (!existing || existing.status !== "scheduled") return json({ error: "Assignment is not open" }, 404);
        if (auth.session.user.role === "volunteer" && (input.action !== "complete" || Number(existing.assigned_user_id) !== auth.session.userId)) return json({ error: "Insufficient role" }, 403);
        if (input.action === "reassign") {
          if (!Number.isInteger(input.assignedUserId) || !await env.DB.prepare("SELECT id FROM users WHERE id = ? AND role IN ('admin', 'coordinator', 'volunteer') AND disabled_at IS NULL").bind(input.assignedUserId).first()) return json({ error: "Active team member not found" }, 400);
        }
        const now = new Date().toISOString();
        const update = input.action === "complete" ? env.DB.prepare("UPDATE feeding_assignments SET status = 'completed', completed_at = ? WHERE id = ? AND status = 'scheduled' AND (? != 'volunteer' OR assigned_user_id = ?)").bind(now, input.id, auth.session.user.role, auth.session.userId) : env.DB.prepare("UPDATE feeding_assignments SET assigned_user_id = ? WHERE id = ? AND status = 'scheduled'").bind(input.assignedUserId, input.id);
        const results = await env.DB.batch([update, env.DB.prepare("INSERT INTO field_assignment_events (id, assignment_id, actor_id, action, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), input.id, auth.session.userId, input.action, now)]);
        if (!results[0].meta?.changes) return json({ error: "Assignment already changed" }, 409);
        return json({ ok: true, action: input.action });
      } catch { return json({ error: "Unable to update assignment" }, 400); }
    }

    const photoRoute = pathname.match(/^\/api\/private\/photos\/([0-9a-f-]{36})(?:\/(review))?$/i);
    if (photoRoute) {
      if (request.method === "GET" && !photoRoute[2]) {
        const auth = await requireRole(request, env, ["admin", "coordinator", "volunteer"]);
        if (!auth.ok) return auth.response;
        return readPrivatePhoto(env, photoRoute[1]);
      }
      if (request.method === "POST" && photoRoute[2]) {
        const auth = await requireRole(request, env, ["admin", "coordinator"], { csrf: true });
        if (!auth.ok) return auth.response;
        try { const body = await readLimitedJson(request, 2048); return reviewPrivatePhoto(env, photoRoute[1], body?.decision, String(auth.session.userId)); }
        catch { return json({ error: "Invalid review" }, 400); }
      }
      return json({ error: "Method not allowed" }, 405);
    }

    if (pathname === "/api/config") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, { Allow: "GET" });
      // This browser key must be restricted by HTTP referrer and to Maps JavaScript API.
      return json({ googleMapsBrowserKey: env.GOOGLE_MAPS_BROWSER_KEY ?? null });
    }

    if (pathname === "/api/triage") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
      const contentType = request.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) return json({ error: "Expected application/json" }, 415);
      try {
        const report = await request.json();
        if (!report || typeof report !== "object" || typeof report.message !== "string" || report.message.length > 4_000) return json({ error: "Invalid report" }, 400);
        return json(await triageReport(report, env));
      } catch { return json({ error: "Unable to triage this report" }, 400); }
    }

    if (pathname === "/api/lost-cat-search") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
      if (!(request.headers.get("content-type") ?? "").includes("application/json")) return json({ error: "Expected application/json" }, 415);
      try { const input = await request.json(); if (!input || typeof input !== "object" || typeof input.description !== "string" || input.description.length > 2_000) return json({ error: "Invalid lost-cat report" }, 400); return json(await predictLostCatLocation(input, env)); }
      catch { return json({ error: "Unable to plan this search" }, 400); }
    }

    if (pathname === "/api/community-signal") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
      if (!(request.headers.get("content-type") ?? "").includes("application/json")) return json({ error: "Expected application/json" }, 415);
      try {
        const input = await request.json();
        if (!input || typeof input !== "object" || input.authorized !== true || typeof input.content !== "string" || !input.content.trim() || input.content.length > 6_000) return json({ error: "Authorized, redacted community content is required" }, 400);
        return json(await analyzeCommunitySignal(input, env));
      } catch { return json({ error: "Unable to stage this community signal" }, 400); }
    }

    if (pathname === "/api/health") {
      if (request.method !== "GET") {
        return json({ error: "Method not allowed" }, 405, { Allow: "GET" });
      }

      try {
        const result = await env.DB.prepare("SELECT 1 AS ok").first();

        if (result?.ok !== 1) {
          return json({ ok: false, service, database: "unavailable" }, 503);
        }

        return json({ ok: true, service, database: "connected" });
      } catch {
        return json({ ok: false, service, database: "unavailable" }, 503);
      }
    }

    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return json({ error: "Not found" }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
