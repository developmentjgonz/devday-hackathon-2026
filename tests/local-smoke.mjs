import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const origin = "http://127.0.0.1:5197";
const login = await fetch(origin + "/api/auth/login", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@mangrovemews.demo", password: "SyntheticMiami2026!" }) });
assert.equal(login.status, 200, await login.clone().text());
const cookies = login.headers.getSetCookie().map((value) => value.split(";")[0]);
const csrf = cookies.find((value) => value.startsWith("mews_csrf=")).slice(10);
const headers = { Origin: origin, Cookie: cookies.join("; "), "X-CSRF-Token": csrf, "Content-Type": "application/json" };
for (const [sourceKind, filename] of [["whatsapp_export", "mangrove-mews-whatsapp-export.txt"], ["sms_relay", "sms-relay.ndjson"]]) {
  const text = readFileSync(new URL("../public/demo-data/" + filename, import.meta.url), "utf8");
  const response = await fetch(origin + "/api/private/raw-import", { method: "POST", headers, body: JSON.stringify({ synthetic: true, sourceKind, text, batchId: "smoke-" + sourceKind + "-" + Date.now() }) });
  assert.ok([201, 409].includes(response.status), await response.text());
}
const snapshot = await fetch(origin + "/api/private/census", { headers });
assert.equal(snapshot.status, 200);
const census = await snapshot.json();
assert.ok(census.colonies.length > 0);
assert.ok(census.cats.some((cat) => cat.cat_key === "CAT-02"));
const intake = await (await fetch(origin + "/api/private/intake", { headers })).json();
assert.ok(intake.feedings.length > 0);
console.log(JSON.stringify({ signedIn: true, colonies: census.colonies.length, catRecords: census.cats.length, sourceReports: intake.reports.length, feedingVisits: intake.feedings.length }));
