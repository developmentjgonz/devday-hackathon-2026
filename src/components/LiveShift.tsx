import { useEffect, useRef, useState } from "react";
import { Check, MapPin, Pause, Play } from "lucide-react";
type Source = { schemaVersion: number; batchId: string; sourceKind: string; provenance: string; records: { id: string; text: string; volunteerAlias: string; broadArea: string; receivedAt: string; attachments?: { fixturePath: string }[] }[] };
type Scenario = "original" | "followup";
type Delivered = Source["records"][number] & { result: string; scenario: Scenario };
const scenarios: Record<Scenario, { label: string; path: string; description: string }> = {
  original: { label: "Original 12-report demo", path: "/demo-data/synthetic-intake-batch.json", description: "Core intake, duplicate review, urgent care, and feeder visit examples." },
  followup: { label: "Expanded 28-report morning", path: "/demo-data/synthetic-followup-shift.json", description: "Multilingual follow-up across eight South Florida demo areas." },
};
export function LiveShift() {
  const [delivered, setDelivered] = useState<Delivered[]>([]);
  const [playing, setPlaying] = useState(false);
  const [scenario, setScenario] = useState<Scenario>("original");
  const [notice, setNotice] = useState("Sign in as an admin or coordinator, then start a fictional shift. Every delivered message is stored by the backend.");
  const indexes = useRef<Record<Scenario, number>>({ original: 0, followup: 0 });
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { controller.current?.abort(); }, []);
  async function play() {
    if (playing) { controller.current?.abort(); setPlaying(false); return; }
    const abort = new AbortController(); controller.current = abort; setPlaying(true);
    try {
      const selected = scenarios[scenario];
      const response = await fetch(selected.path, { signal: abort.signal });
      if (!response.ok) throw new Error("Fixture unavailable");
      const fixture = await response.json() as Source;
      while (indexes.current[scenario] < fixture.records.length && !abort.signal.aborted) {
        const record = fixture.records[indexes.current[scenario]];
        const csrf = document.cookie.split("; ").find((value) => value.startsWith("mews_csrf="))?.slice(10) ?? "";
        // The fixture's stable batch ID plus record ID makes replay idempotent in D1.
        const incoming = await fetch("/api/private/synthetic-import", { method: "POST", signal: abort.signal, headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ ...fixture, synthetic: true, batchId: `${fixture.batchId}-${record.id}`, records: [record] }) });
        if (!incoming.headers.get("content-type")?.includes("application/json")) throw new Error("Backend unavailable");
        const result = await incoming.json();
        if (!incoming.ok && incoming.status !== 409) throw new Error(result.error ?? "Import failed");
        setDelivered((current) => [...current, { ...record, scenario, result: incoming.status === 409 ? "Already stored · original record retained" : "Stored · triage " + (result.modes ?? ["unknown"]).join(", ") }]);
        indexes.current[scenario] += 1;
        dispatchEvent(new Event("mews-data-changed"));
        setNotice(indexes.current[scenario] + " of " + fixture.records.length + " fictional messages delivered from " + selected.label + ".");
        await new Promise<void>((resolve) => { const timer = setTimeout(resolve, 1500); abort.signal.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true }); });
      }
      if (!abort.signal.aborted) setNotice("Shift delivered. Open Care workspace to review the stored census and urgent cases. Replaying keeps the original backend records.");
    } catch (error) { if (!abort.signal.aborted) setNotice(error instanceof Error ? error.message : "Delivery stopped."); }
    finally { if (controller.current === abort) setPlaying(false); }
  }
  return <section className="panel live-shift"><div className="panel-heading"><div><p className="eyebrow">Fictional field chat · backend delivery</p><h2>Live synthetic shift</h2></div><button className="primary-button" onClick={() => void play()}>{playing ? <Pause size={16}/> : <Play size={16}/>} {playing ? "Pause" : "Start / resume"}</button></div><label className="field-label">Demo scenario<select value={scenario} disabled={playing} onChange={(event) => setScenario(event.target.value as Scenario)}>{(Object.entries(scenarios) as [Scenario, typeof scenarios[Scenario]][]).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label><p className="helper-copy">{scenarios[scenario].description} Changing scenarios only changes this replay panel; it never clears stored reports.</p><p role="status">{notice}</p><div className="live-chat-stream" aria-live="polite">{delivered.map((item, index) => <article key={`${item.scenario}-${item.id}-${index}`}><header><b>{item.volunteerAlias}</b><small>{new Date(item.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></header><p>{item.text}</p>{item.attachments?.filter((attachment) => /^\/demo-assets\/[a-z0-9-]+\.png$/i.test(attachment.fixturePath)).map((attachment) => <img key={attachment.fixturePath} src={attachment.fixturePath} alt="Fictional cat photo from incoming message"/>)}<small><MapPin size={13}/> {item.broadArea} · approximate demo area</small><em><Check size={13}/>{item.result}</em></article>)}</div></section>;
}
