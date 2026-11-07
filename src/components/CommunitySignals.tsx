import { useState } from "react";
import { Check, EyeOff, ExternalLink, FileSearch, MapPin, MessageCircleWarning, ShieldCheck, Upload } from "lucide-react";

type Signal = {
  classification: "missing-cat" | "colony-lead" | "not-actionable";
  title: string;
  summary: string;
  area: string | null;
  confidence: number;
  privacyFlags: string[];
  requiredReview: string;
  suggestedNextSteps: string[];
  mode?: string;
};

const redactedSample = "Lost cat: Precious. Long-haired orange tabby with dark stripes, a red nose with black freckles. Missing about four days; last seen at home in the Hollywood Lakes area of Hollywood, FL. Please use the original post's safe contact method. This imported sample intentionally excludes the street address and phone numbers.";

function fallbackSignal(text: string): Signal {
  const lower = text.toLowerCase();
  const colony = /colony|feeding|fed |kittens?|tnr|ear.tip/.test(lower);
  const missing = /lost|missing|not seen|escaped/.test(lower);
  const area = /hollywood|broward/.test(lower) ? "Hollywood / Broward" : /miami beach/.test(lower) ? "Miami Beach" : /miami|331/.test(lower) ? "Miami-Dade" : "South Florida area pending review";
  return {
    classification: missing ? "missing-cat" : colony ? "colony-lead" : "not-actionable",
    title: missing ? "Possible missing-cat case" : colony ? "Possible community-colony lead" : "Needs a clearer report",
    summary: missing ? "A redacted public-post summary was staged as a possible missing-cat case. A coordinator must verify source permission, the original post, and a safe contact path." : colony ? "A community report may indicate a colony lead. A verified volunteer must confirm it before any colony record or map point is created." : "The report does not provide enough safe, reliable information to create a case.",
    area,
    confidence: missing ? .76 : colony ? .61 : .28,
    privacyFlags: ["Exact street address removed", "Phone numbers and owner identity excluded", "Public map uses a broad area only"],
    requiredReview: "Coordinator approval required before creating a case, contact, colony, or assignment.",
    suggestedNextSteps: missing ? ["Verify source authorization and original post timestamp.", "Use the source platform's reply path; do not copy contact details into a public view.", "Create an internal, broad-area search review only after approval."] : ["Ask for an intentionally submitted observation with a broad area.", "Assign a verified volunteer to confirm from legal public access.", "Keep it separate from existing colonies until a person confirms it."],
    mode: "demo",
  };
}

export function CommunitySignals() {
  const [source, setSource] = useState("PawBoost / public listing");
  const [sourceUrl, setSourceUrl] = useState("");
  const [text, setText] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [attachmentCount, setAttachmentCount] = useState(0);
  const [working, setWorking] = useState(false);
  const [signal, setSignal] = useState<Signal | null>(null);
  const [queued, setQueued] = useState(false);

  async function analyze() {
    if (!authorized || !text.trim()) return;
    setWorking(true);
    const payload = { source, sourceUrl, content: text, authorized, attachmentCount };
    try {
      const response = await fetch("/api/community-signal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("signal unavailable");
      setSignal(await response.json() as Signal);
    } catch {
      setSignal(fallbackSignal(text));
    } finally {
      setWorking(false);
      setQueued(false);
    }
  }

  return <section className="community-signals panel" aria-labelledby="community-signals-title">
    <header className="community-heading">
      <div><p className="eyebrow">Authorized community intake · review first</p><h2 id="community-signals-title">Community signals desk</h2><p>Use an approved feed, a moderator export, or a link/text intentionally submitted to the rescue. This agent does not automate Facebook groups or collect live-chat content.</p></div>
      <span className="community-agent"><FileSearch size={15}/>Agent-assisted</span>
    </header>
    <div className="community-layout">
      <form className="community-form" onSubmit={(event) => { event.preventDefault(); void analyze(); }}>
        <label className="field-label">Authorized source<select value={source} onChange={(event) => setSource(event.target.value)}><option>PawBoost / public listing</option><option>Moderator-approved Facebook export</option><option>Consent-based neighborhood feed</option><option>Volunteer-submitted link or note</option></select></label>
        <label className="field-label">Source URL or feed reference <input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="Optional reference; never fetched from this page"/></label>
        <label className="field-label">Redacted post text <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste only an authorized post. Remove phone numbers, house numbers, email addresses, and owner names first."/></label>
        <div className="community-form-actions"><button type="button" className="text-button" onClick={() => { setText(redactedSample); setSource("PawBoost / public listing"); }}><Upload size={14}/>Load redacted sample</button><label className="community-upload"><span>Reference image count</span><input type="file" accept="image/*" multiple onChange={(event) => setAttachmentCount(event.target.files?.length ?? 0)}/><small>{attachmentCount ? `${attachmentCount} selected` : "optional"}</small></label></div>
        <label className="community-consent"><input type="checkbox" checked={authorized} onChange={(event) => setAuthorized(event.target.checked)}/><span><b>I am authorized to submit this source</b><small>I removed private contact details and exact home locations. The source’s terms and moderator rules allow this use.</small></span></label>
        <button className="primary-button community-submit" disabled={!authorized || !text.trim() || working}>{working ? "Analyzing safe fields…" : "Stage for coordinator review"}<ExternalLink size={15}/></button>
      </form>
      <aside className="community-result" aria-live="polite">
        {!signal ? <div className="community-empty"><MessageCircleWarning size={22}/><b>No signal staged yet</b><p>The parser retains cat descriptors, broad area, timing, photo count, and source reference. It strips direct contact details and exact home locations before review.</p></div> : <><div className="signal-status"><span className={signal.classification}>{signal.classification.replaceAll("-", " ")}</span><b>{Math.round(signal.confidence * 100)}% extraction confidence</b></div><h3>{signal.title}</h3><p>{signal.summary}</p>{signal.area && <p className="signal-area"><MapPin size={14}/>{signal.area} · broad-area only</p>}<div className="signal-privacy"><p><EyeOff size={14}/>Privacy actions</p>{signal.privacyFlags.map((flag) => <span key={flag}>{flag}</span>)}</div><p className="signal-review"><ShieldCheck size={14}/>{signal.requiredReview}</p><div className="signal-steps">{signal.suggestedNextSteps.map((step) => <p key={step}><Check size={13}/>{step}</p>)}</div><button className={queued ? "secondary-button queued" : "primary-button"} onClick={() => setQueued(true)} disabled={queued}>{queued ? "Queued for coordinator review" : "Queue internal review"}</button></>}
      </aside>
    </div>
  </section>;
}
