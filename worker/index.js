import { analyzeCommunitySignal, predictLostCatLocation, triageReport } from "./triage-agent.js";

const service = "devday-js-2026";

function json(body, status = 200, headers = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

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
