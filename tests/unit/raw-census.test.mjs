import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseSyntheticSmsRelay, parseSyntheticWhatsAppExport, sourceTrace } from "../../worker/raw-intake.js";
import { prepareSyntheticImport } from "../../worker/intake.js";

test("parses a clearly disclosed fictional WhatsApp export and retains attachment trace", () => {
  const batch = parseSyntheticWhatsAppExport({ batchId: "raw-wa-test", provenance: "Synthetic fictional fixture only.", text: "11/07/2026, 5:43 PM - Demo Thread: Synthetic training thread only.\n11/07/2026, 5:46 PM - Maya: Split-face calico held up front paw. Count 6 adults. Little Havana demo area.\n11/07/2026, 5:46 PM - Maya: <attached: poppy-calico-limp.png>" });
  assert.equal(batch.records.length, 1);
  assert.equal(batch.records[0].proposedCatKey, "CAT-04");
  assert.equal(batch.records[0].attachments[0].fixturePath, "/demo-assets/poppy-calico-limp.png");
  assert.equal(sourceTrace(batch.records[0], { parser: batch.parser.name, batchId: batch.batchId }).synthetic, true);
});

test("rejects raw chat input without a synthetic disclosure", () => {
  assert.throws(() => parseSyntheticWhatsAppExport({ batchId: "raw-wa-test", provenance: "Synthetic fictional fixture only.", text: "11/07/2026, 5:46 PM - Maya: Calico by pallets." }));
});

test("parses only explicitly demo-tagged SMS relay rows", () => {
  const batch = parseSyntheticSmsRelay({ batchId: "raw-sms-test", provenance: "Synthetic fixture.", ndjson: "{\"id\":\"demo-1\",\"from\":\"Synthetic Maya\",\"received_at\":\"2026-11-07T18:00:00-05:00\",\"body\":\"DEMO: Orange tabby with white chin may be pregnant. Fed 7. Little River area.\",\"attachments\":[\"/demo-assets/marmalade-orange-tabby.png\"]}" });
  assert.equal(batch.records[0].proposedCatKey, "CAT-02");
  assert.equal(batch.records[0].feedingConfirmed, true);
});

test("expanded fictional morning shift parses across South Florida without false injury or duplicate identities", async () => {
  const [fixtureText, whatsappText, smsText] = await Promise.all([
    readFile(new URL("../../public/demo-data/synthetic-followup-shift.json", import.meta.url), "utf8"),
    readFile(new URL("../../public/demo-data/mangrove-mews-followup-whatsapp-export.txt", import.meta.url), "utf8"),
    readFile(new URL("../../public/demo-data/followup-sms-relay.ndjson", import.meta.url), "utf8"),
  ]);
  const fixture = JSON.parse(fixtureText);
  const whatsapp = parseSyntheticWhatsAppExport({ batchId: "followup-wa-parse", provenance: fixture.provenance, text: whatsappText });
  const sms = parseSyntheticSmsRelay({ batchId: "followup-sms-parse", provenance: fixture.provenance, ndjson: smsText });
  assert.equal(fixture.records.length, 28);
  assert.equal(whatsapp.records.length, 14);
  assert.equal(sms.records.length, 14);
  assert.deepEqual(new Set(fixture.records.map((record) => record.broadArea)), new Set(["Little Havana", "Little River", "North Miami", "Fort Lauderdale", "Miami Beach", "Hialeah", "Homestead", "Hollywood / Broward"]));
  assert.equal(whatsapp.records.find((record) => record.text.includes("No new injury"))?.flags.includes("injury"), false);
  assert.equal(whatsapp.records.find((record) => record.text.includes("talvez seja"))?.proposedCatKey, "CAT-02-ALT");
  assert.equal(whatsapp.records.find((record) => record.text.includes("Skipper"))?.proposedCatKey, "CAT-SKIPPER");
  assert.equal(whatsapp.records.find((record) => record.text.includes("Coal"))?.proposedColonyKey, "COL-HL-DEMO");
  assert.equal(sms.records.find((record) => record.text.includes("muito calor"))?.flags.includes("heat"), true);
  const prepared = prepareSyntheticImport(fixture);
  assert.equal(prepared.messages.length, 28);
  assert.ok(prepared.messages.length <= 100);
  assert.ok(prepared.messages.some((message) => message.urgency === "urgent" && message.flags.includes("feeder_gap")));
  assert.ok(prepared.messages.some((message) => message.review.some((review) => review.kind === "possible_duplicate")));
});
