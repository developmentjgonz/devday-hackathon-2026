import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock3, FileText, LoaderCircle, MapPin, MessageSquareText, RefreshCw, ShieldCheck, Smartphone, Upload, X } from "lucide-react";
import "./OfflineIntakeDesk.css";

const STORAGE_KEY = "mews-offline-intake-outbox-v1";

export type IntakeTrace = {
  source: "whatsapp-export" | "sms-relay" | "phone-form";
  sourceLabel: string;
  receivedAt: string;
  reporterLabel: string;
  approximateArea: string | null;
  attachmentLabels: string[];
  importedAt: string;
};

export type OfflineIntakeItem = {
  id: string;
  trace: IntakeTrace;
  payload: {
    message: string;
    catCount: string;
    feedingConfirmed: boolean;
    urgent: boolean;
    source: "web" | "sms" | "whatsapp";
    colonyId: null;
    attachmentCount: number;
  };
  state: "queued" | "sending" | "sent" | "needs-retry";
  attempts: number;
  lastAttemptAt: string | null;
  lastError: string | null;
};

export type StagedFixture = {
  id: string;
  trace: IntakeTrace;
  payload: OfflineIntakeItem["payload"];
};

type OfflineIntakeDeskProps = {
  /** Optional integration hooks; the parent app owns any durable state or navigation. */
  onDelivered?: (item: OfflineIntakeItem, result: unknown) => void;
  onStaged?: (items: StagedFixture[]) => void;
};

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeStorageRead(): OfflineIntakeItem[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is OfflineIntakeItem => Boolean(item?.id && item?.payload && item?.trace)).map((item) => item.state === "sending" ? { ...item, state: "needs-retry" } : item) : [];
  } catch {
    return [];
  }
}

function extractCount(value: string) {
  const match = value.match(/(?:count(?: at the area)?:?|fed|seen)\s*(\d+)/i) ?? value.match(/(\d+)\s+(?:adults|cats|seen)/i);
  return match?.[1] ?? "";
}

function approximateArea(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("flagler") || lower.includes("little havana")) return "Little Havana (approximate fixture area)";
  if (lower.includes("little river")) return "Little River (approximate fixture area)";
  if (lower.includes("riverwalk") || lower.includes("fort lauderdale")) return "Fort Lauderdale / Broward (approximate fixture area)";
  if (lower.includes("canal")) return "North Miami (approximate fixture area)";
  return null;
}

function urgentFromText(value: string) {
  const withoutNegatedRisk = value.replace(/\bno (?:new )?(?:injur(?:y|ies)|bleeding|illness|sickness)\b/gi, "");
  return /limp|injur|bleed|pregnan|kitten|not (?:eat|eating)|sick/i.test(withoutNegatedRisk);
}

/** Parses only an intentionally supplied fixture. It never connects to WhatsApp. */
export function parseWhatsAppFixture(text: string): StagedFixture[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const sharedAreas = new Map<string, string>();
  const messages = lines.map((line, index) => {
    const match = line.match(/^(\d{2}\/\d{2}\/\d{4},\s+[^-]+)\s+-\s+([^:]+):\s+(.+)$/);
    if (!match || match[3].startsWith("<attached:")) return null;
    const [, receivedAt, reporterLabel, body] = match;
    if (/location shared/i.test(body)) { const area = approximateArea(body); if (area) sharedAreas.set(`${reporterLabel}|${receivedAt}`, area); return null; }
    const attachment = lines[index + 1]?.match(/^.+<attached:\s*([^>]+)>$/)?.[1];
    return { receivedAt, reporterLabel, body, attachment, sharedArea: sharedAreas.get(`${reporterLabel}|${receivedAt}`) ?? null };
  }).filter((item): item is { receivedAt: string; reporterLabel: string; body: string; attachment: string | undefined; sharedArea: string | null } => item !== null);

  return messages.filter(({ body }) => /split-face calico|orange tabby|maybe 3 kittens|evening feed complete|tux has not/i.test(body)).map((message) => {
    const area = approximateArea(message.body) ?? message.sharedArea;
    const trace: IntakeTrace = {
      source: "whatsapp-export",
      sourceLabel: "Fictional WhatsApp Export fixture",
      receivedAt: message.receivedAt,
      reporterLabel: message.reporterLabel.replace(/\b(?:Maya|Joel|Rina|Ana|Alex).*$/i, (value) => value.startsWith("Alex") ? "Synthetic coordinator" : "Synthetic volunteer"),
      approximateArea: area,
      attachmentLabels: message.attachment ? [message.attachment] : [],
      importedAt: new Date().toISOString(),
    };
    return {
      id: id("wa"),
      trace,
      payload: {
        message: message.body,
        catCount: extractCount(message.body),
        feedingConfirmed: /feed complete|fed\s*\d+/i.test(message.body),
        urgent: urgentFromText(message.body),
        source: "whatsapp",
        colonyId: null,
        attachmentCount: trace.attachmentLabels.length,
      },
    };
  });
}

/** Parses the shipped NDJSON relay fixture; it does not make an SMS-provider call. */
export function parseSmsFixture(text: string): StagedFixture[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
    try {
      const value = JSON.parse(line) as { id?: string; received_at?: string; from?: string; body?: string; attachments?: string[]; location?: string; expected?: { urgency?: string } };
      if (!value.body) return [];
      const trace: IntakeTrace = {
        source: "sms-relay",
        sourceLabel: "Fictional intentional SMS relay fixture",
        receivedAt: value.received_at ?? "Fixture timestamp unavailable",
        reporterLabel: "Synthetic relay sender",
        approximateArea: approximateArea(`${value.location ?? ""} ${value.body}`),
        attachmentLabels: Array.isArray(value.attachments) ? value.attachments.map((item) => item.split("/").pop() ?? "fixture attachment") : [],
        importedAt: new Date().toISOString(),
      };
      return [{
        id: value.id ?? id("sms"),
        trace,
        payload: {
          message: value.body,
          catCount: extractCount(value.body),
          feedingConfirmed: /fed\s*\d+/i.test(value.body),
          urgent: value.expected?.urgency === "urgent" || urgentFromText(value.body),
          source: "sms" as const,
          colonyId: null,
          attachmentCount: trace.attachmentLabels.length,
        },
      }];
    } catch {
      return [];
    }
  });
}

function isSent(item: OfflineIntakeItem) {
  return item.state === "sent";
}

export function OfflineIntakeDesk({ onDelivered, onStaged }: OfflineIntakeDeskProps) {
  const [outbox, setOutbox] = useState<OfflineIntakeItem[]>([]);
  const [staged, setStaged] = useState<StagedFixture[]>([]);
  const [fixture, setFixture] = useState<"whatsapp" | "sms">("whatsapp");
  const [acknowledged, setAcknowledged] = useState(false);
  const [status, setStatus] = useState("Load the included fictional fixture or select a local text file.");
  const [hydrated, setHydrated] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOutbox(safeStorageRead());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(outbox)); } catch { /* A full/private browser should not block the visible queue. */ }
  }, [hydrated, outbox]);

  const pending = useMemo(() => outbox.filter((item) => !isSent(item)), [outbox]);
  const delivered = useMemo(() => outbox.filter(isSent), [outbox]);

  function stageText(text: string, label: string) {
    const parsed = fixture === "whatsapp" ? parseWhatsAppFixture(text) : parseSmsFixture(text);
    if (!parsed.length) {
      setStatus(`No recognizable fictional ${label} entries were found. Keep this interface for the shipped fixtures or an intentionally supplied export.`);
      return;
    }
    setStaged(parsed);
    onStaged?.(parsed);
    setStatus(`${parsed.length} synthetic report${parsed.length === 1 ? "" : "s"} staged. Review the trace before adding to the offline outbox.`);
  }

  async function loadIncludedFixture() {
    const url = fixture === "whatsapp" ? "/demo-data/mangrove-mews-whatsapp-export.txt" : "/demo-data/sms-relay.ndjson";
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Fixture unavailable");
      stageText(await response.text(), fixture === "whatsapp" ? "WhatsApp export" : "SMS relay");
    } catch {
      setStatus("The included fixture could not be loaded. You can select its local text file instead.");
    }
  }

  async function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      setStatus("For the demo, choose a text fixture smaller than 500 KB.");
      return;
    }
    try {
      stageText(await file.text(), file.name);
    } catch {
      setStatus("That file could not be read as text.");
    } finally {
      event.target.value = "";
    }
  }

  function queueStaged() {
    if (!acknowledged) {
      setStatus("Confirm that the source is intentional and synthetic/authorized before it can be staged.");
      return;
    }
    const added = staged.map((candidate) => ({ ...candidate, state: "queued" as const, attempts: 0, lastAttemptAt: null, lastError: null }));
    setOutbox((current) => [...added, ...current]);
    setStaged([]);
    setStatus(`${added.length} report${added.length === 1 ? "" : "s"} added to this device’s offline outbox. Nothing was auto-merged or published.`);
  }

  async function retry(item: OfflineIntakeItem) {
    setOutbox((current) => current.map((value) => value.id === item.id ? { ...value, state: "sending", attempts: value.attempts + 1, lastAttemptAt: new Date().toISOString(), lastError: null } : value));
    try {
      const response = await fetch("/api/triage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item.payload) });
      if (!response.ok) throw new Error(`Triage returned ${response.status}`);
      const result = await response.json() as unknown;
      const deliveredItem = { ...item, state: "sent" as const, attempts: item.attempts + 1, lastAttemptAt: new Date().toISOString(), lastError: null };
      setOutbox((current) => current.map((value) => value.id === item.id ? deliveredItem : value));
      onDelivered?.(deliveredItem, result);
      setStatus("A triage response was received. This demo does not persist a review record, change a census, or create an assignment.");
    } catch {
      setOutbox((current) => current.map((value) => value.id === item.id ? { ...value, state: "needs-retry", attempts: value.attempts + 1, lastAttemptAt: new Date().toISOString(), lastError: "No response from triage. Kept on this device for retry." } : value));
      setStatus("The report stayed in the offline outbox. Retry it when this app can reach the triage endpoint.");
    }
  }

  async function retryAll() {
    for (const item of pending.filter((value) => value.state !== "sending")) await retry(item);
  }

  useEffect(() => {
    const retryWhenOnline = () => { void retryAll(); };
    window.addEventListener("online", retryWhenOnline);
    return () => window.removeEventListener("online", retryWhenOnline);
  });

  function remove(item: OfflineIntakeItem) {
    setOutbox((current) => current.filter((value) => value.id !== item.id));
    setStatus("Removed the selected local outbox record from this browser only.");
  }

  return <section className="offline-intake-desk" aria-labelledby="offline-intake-title">
    <header className="offline-intake-heading">
      <div><p className="offline-kicker">Demo intake operations</p><h2 id="offline-intake-title">Import trace + offline retry desk</h2><p>For the included synthetic fixtures or intentionally supplied, authorized text only. This component never reads a live chat or sends files to a third party.</p></div>
      <div className="offline-summary"><b>{pending.length}</b><span>pending<br/>on this device</span></div>
    </header>

    <div className="offline-intake-grid">
      <section className="fixture-stage" aria-labelledby="fixture-stage-title">
        <div className="offline-section-heading"><div><p className="offline-kicker">1 · Review the source</p><h3 id="fixture-stage-title">Stage a fictional fixture</h3></div><ShieldCheck size={19}/></div>
        <div className="fixture-tabs" role="tablist" aria-label="Fixture type">
          <button role="tab" aria-selected={fixture === "whatsapp"} className={fixture === "whatsapp" ? "active" : ""} onClick={() => { setFixture("whatsapp"); setStaged([]); }}><MessageSquareText size={15}/>WhatsApp export</button>
          <button role="tab" aria-selected={fixture === "sms"} className={fixture === "sms" ? "active" : ""} onClick={() => { setFixture("sms"); setStaged([]); }}><Smartphone size={15}/>SMS relay</button>
        </div>
        <p className="fixture-note">{fixture === "whatsapp" ? "Reads an intentionally exported .txt fixture; it does not log in to, scrape, or poll WhatsApp." : "Reads the included intentional relay NDJSON fixture; it does not connect to an SMS provider."}</p>
        <div className="fixture-actions"><button type="button" className="offline-primary" onClick={() => void loadIncludedFixture()}><FileText size={15}/>Load included fixture</button><button type="button" className="offline-secondary" onClick={() => input.current?.click()}><Upload size={15}/>Choose local text</button><input ref={input} className="sr-only" type="file" accept=".txt,.ndjson,text/plain,application/x-ndjson" onChange={(event) => void chooseFile(event)}/></div>
        <label className="fixture-consent"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)}/><span><b>I confirm this source is fictional for the demo or intentionally supplied with authorization.</b><small>Do not use real private chats, people, or rescue locations in this hackathon demo.</small></span></label>
        {staged.length > 0 && <div className="staged-list"><div className="staged-list-header"><b>{staged.length} staged report{staged.length === 1 ? "" : "s"}</b><button type="button" onClick={() => setStaged([])}>Clear</button></div>{staged.map((candidate) => <TraceCard key={candidate.id} trace={candidate.trace} message={candidate.payload.message} urgent={candidate.payload.urgent}/>)}</div>}
        <button type="button" className="offline-primary queue-staged" disabled={!staged.length} onClick={queueStaged}><Clock3 size={15}/>Add staged reports to offline outbox</button>
      </section>

      <section className="outbox-stage" aria-labelledby="outbox-stage-title">
        <div className="offline-section-heading"><div><p className="offline-kicker">2 · Send when available</p><h3 id="outbox-stage-title">Device-only outbox</h3></div><button type="button" className="retry-all" disabled={!pending.length} onClick={() => void retryAll()}><RefreshCw size={14}/>Retry pending</button></div>
        <p className="outbox-note">Queued records stay in this browser’s local storage until they reach `/api/triage`, are removed, or browser storage is cleared. A successful retry only receives a triage response; this demo does not persist a review record or mutate a census.</p>
        <div className="outbox-list">{!outbox.length ? <div className="outbox-empty"><Clock3 size={20}/><b>No queued fixture reports</b><span>Load a sample and add it to the device outbox to demonstrate safe retry behavior.</span></div> : outbox.map((item) => <article className={`outbox-item ${item.state}`} key={item.id}><div className="outbox-item-top"><span className={`outbox-state ${item.state}`}>{item.state === "sent" ? "Delivered" : item.state === "sending" ? "Sending" : item.state === "needs-retry" ? "Retry needed" : "Queued"}</span><small>{item.attempts ? `${item.attempts} attempt${item.attempts === 1 ? "" : "s"}` : "Not sent yet"}</small></div><TraceCard trace={item.trace} message={item.payload.message} urgent={item.payload.urgent}/>{item.lastError && <p className="outbox-error">{item.lastError}</p>}<footer>{item.state !== "sent" && <button type="button" className="offline-secondary" onClick={() => void retry(item)}>{item.state === "sending" ? <LoaderCircle className="spin" size={14}/> : <RefreshCw size={14}/>}{item.state === "sending" ? "Trying…" : "Retry now"}</button>}<button type="button" className="remove-outbox" onClick={() => remove(item)} aria-label="Remove local outbox record"><X size={15}/>Remove</button></footer></article>)}</div>
        {!!delivered.length && <p className="delivered-note"><Check size={14}/>{delivered.length} delivery receipt{delivered.length === 1 ? "" : "s"} retained locally for this demo session.</p>}
      </section>
    </div>
    <p className="offline-status" role="status">{status}</p>
  </section>;
}

function TraceCard({ trace, message, urgent }: { trace: IntakeTrace; message: string; urgent: boolean }) {
  return <article className="trace-card"><div className="trace-card-meta"><span>{trace.source === "whatsapp-export" ? "Export" : trace.source === "sms-relay" ? "Relay" : "Phone"}</span><small>{trace.receivedAt}</small>{urgent && <b>Urgency flag</b>}</div><p>{message}</p><div className="trace-card-footer"><span><MapPin size={12}/>{trace.approximateArea ?? "No broad area in fixture"}</span><span>{trace.attachmentLabels.length ? `${trace.attachmentLabels.length} fixture attachment${trace.attachmentLabels.length === 1 ? "" : "s"}` : "No fixture attachment"}</span></div></article>;
}
