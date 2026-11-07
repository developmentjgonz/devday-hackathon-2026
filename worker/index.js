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
