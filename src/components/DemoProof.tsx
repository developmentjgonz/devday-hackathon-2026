import { useState } from "react";
import { AlertTriangle, Check, ClipboardCheck, FileDown, MapPin, MessagesSquare, Stethoscope, UsersRound } from "lucide-react";
import { CommunitySignals } from "@/components/CommunitySignals";

/**
 * A deliberately local, transparent replay of the supplied fictional fixture.
 * It gives a judge a compact way to see the report → review → census outcome
 * without presenting the fixture as live WhatsApp data.
 */
export function DemoProof() {
  const [replayed, setReplayed] = useState(false);

  return <section className="demo-proof panel" aria-labelledby="demo-proof-title">
    <header className="demo-proof-heading">
      <div>
        <p className="eyebrow">Judge-ready workflow proof</p>
        <h2 id="demo-proof-title">Intentional messages become reviewable care work</h2>
        <p>Replays only the included fictional WhatsApp export and consented SMS relay. No live-chat access or real locations.</p>
      </div>
      <button className="secondary-button" onClick={() => setReplayed(true)}>
        <FileDown size={16}/>{replayed ? "Fixture replayed" : "Replay demo batch"}
      </button>
    </header>

    <div className="demo-pipeline" aria-label="Demo batch processing stages">
      <article className="pipeline-stage source">
        <MessagesSquare size={18}/><div><span>1 · Intentional intake</span><b>8 fictional messages · 3 photos · 2 shared pins</b><small>WhatsApp export + SMS relay</small></div>
      </article>
      <article className="pipeline-arrow" aria-hidden="true">→</article>
      <article className="pipeline-stage match">
        <ClipboardCheck size={18}/><div><span>2 · Agent suggestion</span><b>Colony, cat, urgency, and duplicate evidence</b><small>Nothing is merged automatically</small></div>
      </article>
      <article className="pipeline-arrow" aria-hidden="true">→</article>
      <article className="pipeline-stage outcome">
        <Check size={18}/><div><span>3 · Human-reviewed census</span><b>Visits, TNR needs, vet queue, and tasks</b><small>Same-day operating picture</small></div>
      </article>
    </div>

    <div className="demo-proof-grid">
      <article className={replayed ? "proof-card complete" : "proof-card"}>
        <span className="proof-icon green"><MapPin size={16}/></span>
        <div><p>Location → colony</p><h3>Flagler Yard · 82% suggestion</h3><small>Poppy’s photo and shared approximate pin route to the colony review without retyping.</small></div>
        <b className="proof-state">{replayed ? "Queued" : "Ready"}</b>
      </article>
      <article className={replayed ? "proof-card complete" : "proof-card"}>
        <span className="proof-icon violet"><UsersRound size={16}/></span>
        <div><p>Photo → possible duplicate</p><h3>Marmalade · 91% visual / 96% markings</h3><small>Two photos count once only after a coordinator approves the suggested match.</small></div>
        <b className="proof-state">Human merge</b>
      </article>
      <article className="proof-card urgent-proof">
        <span className="proof-icon coral"><AlertTriangle size={16}/></span>
        <div><p>Urgency → today’s queue</p><h3>Poppy injury · Marmalade pregnancy · new kittens</h3><small>Injury and pregnancy are immediate human-decision alerts; kitten count retains uncertainty.</small></div>
        <b className="proof-state">3 reviews</b>
      </article>
    </div>

    <div className="operating-snapshot">
      <div><p className="eyebrow">Feeder visit log</p><b>Joel · Little River Laundry</b><small>Fed 7 · yesterday 6:24 PM · count confirmation saved</small></div>
      <div><p className="eyebrow">Care census</p><b>142 cats · 109 fixed · 21 TNR pending</b><small>Colony table retains the last feeder and time for each group.</small></div>
      <div><p className="eyebrow">Sponsor/city-safe rollup</p><b>6 medical cases resolved · 2 active reviews</b><small>Aggregated results only; no feeder identities or precise locations.</small></div>
      <div className="snapshot-action"><Stethoscope size={17}/><span>{replayed ? "Demo batch added to coordinator review" : "Replay to show the same-day update"}</span></div>
    </div>
    <CommunitySignals/>
  </section>;
}
