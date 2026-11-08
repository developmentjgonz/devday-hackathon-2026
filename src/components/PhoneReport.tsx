import { useEffect, useState } from "react";
import { Camera, MapPin, Send } from "lucide-react";
import { privateJson } from "../lib/private-api";
import { deliverFieldOutbox, fieldOutbox, queueFieldReport } from "../lib/field-outbox";

const locations = ["Little Havana", "Little River", "North Miami", "Fort Lauderdale", "Miami Beach", "Hialeah", "Homestead", "Hollywood / Broward"];
const photos = [
  ["poppy-calico-limp.png", "Poppy · calico"],
  ["marmalade-orange-tabby.png", "Marmalade · orange tabby"],
  ["tux-missing-search.png", "Tux · black and white"],
] as const;
export function PhoneReport() {
  const [message, setMessage] = useState("Demo: split-face calico is limping and holding up her front paw. Saw 6 adults.");
  const [area, setArea] = useState("Little Havana");
  const [photo, setPhoto] = useState<string>(photos[0][0]);
  const [count, setCount] = useState("6");
  const [fed, setFed] = useState(false);
  const [urgent, setUrgent] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("A fictional phone report: text, photo and shared demo area go to the census together. Team sign-in required.");
  const [deliveryId, setDeliveryId] = useState(() => crypto.randomUUID());
  const [owner, setOwner] = useState<number | null>(null);
  const [queued, setQueued] = useState(fieldOutbox);
  useEffect(() => {
    void privateJson("/api/auth/session").then((session) => setOwner(session.user.id)).catch(() => undefined);
    const sync = () => setQueued(fieldOutbox()); addEventListener("mews-outbox-changed", sync);
    return () => removeEventListener("mews-outbox-changed", sync);
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setWorking(true);
    const payload = { synthetic: true, id: deliveryId, observedAt: new Date().toISOString(), message, broadArea: area, photo: "/demo-assets/" + photo, count: count === "" ? null : Number(count), feedingConfirmed: fed, urgent };
    try {
      if (!owner) throw new Error("Sign in before submitting or queueing a team report.");
      queueFieldReport(owner, payload);
      if (!navigator.onLine) { setNotice("Queued on this device. It will retry when connected and signed in to the same account."); setDeliveryId(crypto.randomUUID()); return; }
      const result = await privateJson("/api/private/field-report", payload);
      setNotice("Stored with source trace " + result.traceIds[0] + ". The census and review queue have updated.");
      setDeliveryId(crypto.randomUUID()); dispatchEvent(new Event("mews-data-changed"));
      void deliverFieldOutbox();
    } catch (error) { setNotice((fieldOutbox().some((item) => item.id === deliveryId) ? "Retained in your device outbox. " : "") + (error instanceof Error ? error.message : "Delivery failed; retry when connected.")); }
    finally { setWorking(false); }
  }
  return <section className="panel phone-report"><header className="panel-heading"><div><p className="eyebrow">One-minute mobile check-in</p><h2>Send a field report</h2></div><Send size={20}/></header><form onSubmit={(event) => void submit(event)}><label className="field-label">What did you see?<textarea value={message} maxLength={2000} onChange={(event) => setMessage(event.target.value)} required/></label><div className="two-fields"><label className="field-label"><MapPin size={14}/>Shared fictional area<select value={area} onChange={(event) => setArea(event.target.value)}>{locations.map((value) => <option key={value}>{value}</option>)}</select></label><label className="field-label">Cats counted (optional)<input type="number" min={0} max={200} value={count} onChange={(event) => setCount(event.target.value)}/></label></div><label className="field-label"><Camera size={14}/>Attach a fictional cat photo<select value={photo} onChange={(event) => setPhoto(event.target.value)}>{photos.map(([file, label]) => <option key={file} value={file}>{label}</option>)}</select></label><img className="phone-report-photo" src={"/demo-assets/" + photo} alt="Selected fictional cat evidence"/><div className="shared-actions"><label className="layer-control"><input type="checkbox" checked={fed} onChange={(event) => setFed(event.target.checked)}/>Feeding confirmed</label><label className="layer-control"><input type="checkbox" checked={urgent} onChange={(event) => setUrgent(event.target.checked)}/>Urgent welfare concern</label></div><p>Photo suggestions: face, coat markings and injury area, from a safe distance. No real GPS or camera access is requested in this demo.</p><button className="primary-button" disabled={working}>{working ? "Sending…" : "Send fictional report"}<Send size={15}/></button></form><p role="status">{notice}</p><p>{queued.length} report(s) remain on this device. Keep this app open to retry when service returns.</p>{queued.length > 0 && <button className="secondary-button" onClick={() => void deliverFieldOutbox()}>Retry queued field reports</button>}</section>;
}
