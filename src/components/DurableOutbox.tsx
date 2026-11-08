import { useEffect, useRef, useState } from "react";
import { Check, RefreshCw, Upload } from "lucide-react";

type Item = { id: string; sourceKind: "whatsapp_export" | "sms_relay"; text: string; status: "queued" | "sending" | "stored"; error?: string; batchId?: string };
const storageKey = "mews-durable-source-outbox";
function token() { return document.cookie.split("; ").find((part) => part.startsWith("mews_csrf="))?.slice(10) ?? ""; }
function restore(): Item[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item) => typeof item.id === "string" && typeof item.text === "string" && item.text.length <= 60000 && ["whatsapp_export", "sms_relay"].includes(item.sourceKind)).map((item) => ({ ...item, status: item.status === "stored" ? "stored" : "queued" }));
  } catch { return []; }
}
export function DurableOutbox() {
  const [items, setItems] = useState<Item[]>(restore);
  const [sourceKind, setKind] = useState<Item["sourceKind"]>("whatsapp_export");
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const locks = useRef(new Set<string>());
  const latest = useRef(items); latest.current = items;
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch { setNotice("Browser storage is full; this outbox may not survive a reload."); } }, [items]);
  async function send(item: Item) {
    if (locks.current.has(item.id) || item.status === "stored") return;
    locks.current.add(item.id); setItems((current) => current.map((value) => value.id === item.id ? { ...value, status: "sending", error: undefined } : value));
    try {
      const response = await fetch("/api/private/raw-import", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRF-Token": token() }, body: JSON.stringify({ synthetic: true, sourceKind: item.sourceKind, text: item.text, batchId: item.id }) });
      if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Backend unavailable; retained on this device.");
      const result = await response.json();
      if (!response.ok && !(response.status === 409 && result.batchId)) throw new Error(result.error ?? "Import failed");
      setItems((current) => current.map((value) => value.id === item.id ? { ...value, status: "stored", batchId: result.batchId, error: undefined } : value));
      setNotice("Source stored by the backend. Open Care workspace to see its census, reviews and feeding visits.");
      dispatchEvent(new Event("mews-data-changed"));
    } catch (error) { setItems((current) => current.map((value) => value.id === item.id ? { ...value, status: "queued", error: error instanceof Error ? error.message : "Retry needed" } : value)); }
    finally { locks.current.delete(item.id); }
  }
  const sender = useRef(send); sender.current = send;
  useEffect(() => {
    const online = async () => { for (const item of latest.current.filter((value) => value.status !== "stored")) await sender.current(item); };
    addEventListener("online", online); return () => removeEventListener("online", online);
  }, []);
  async function loadFixture() {
    try { const response = await fetch(sourceKind === "whatsapp_export" ? "/demo-data/mangrove-mews-whatsapp-export.txt" : "/demo-data/sms-relay.ndjson"); if (!response.ok) throw new Error(); setText(await response.text()); setNotice("Fictional fixture loaded. Queue it to persist on this device."); }
    catch { setNotice("Could not load fixture."); }
  }
  return <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Fictional chat sources · durable backend delivery</p><h2>Offline source outbox</h2></div><Upload size={20}/></div><p>Load an exported fictional chat, queue it on this device, and send it when connected. Sign in through Care workspace first. Repeated delivery preserves the original source records.</p><div className="shared-actions"><select aria-label="Outbox source" value={sourceKind} onChange={(event) => setKind(event.target.value as Item["sourceKind"])}><option value="whatsapp_export">WhatsApp export</option><option value="sms_relay">SMS relay</option></select><button className="secondary-button" onClick={() => void loadFixture()}>Load fictional fixture</button><label className="secondary-button">Choose text file<input hidden type="file" accept=".txt,.ndjson" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 60000) { setNotice("Use a source smaller than 60 KB."); return; } void file.text().then(setText); }}/></label></div><label className="field-label">Synthetic source text<textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={60000}/></label><button className="primary-button" disabled={!text.trim()} onClick={() => { setItems((current) => [...current, { id: "outbox-" + crypto.randomUUID(), sourceKind, text, status: "queued" }]); setText(""); setNotice("Queued on this device. It will retry when connectivity returns, or use Send now."); }}>Queue fictional source</button><p role="status">{notice}</p>{items.map((item) => <article className="shared-assignment" key={item.id}><span><b>{item.sourceKind.replaceAll("_", " ")} · {item.status}</b><small>{item.id}</small>{item.batchId && <small>Stored batch {item.batchId}</small>}{item.error && <small role="alert">{item.error}</small>}</span>{item.status !== "stored" ? <button className="secondary-button" disabled={item.status === "sending"} onClick={() => void send(item)}><RefreshCw size={14}/>Send now</button> : <Check size={20}/>}</article>)}</section>;
}
