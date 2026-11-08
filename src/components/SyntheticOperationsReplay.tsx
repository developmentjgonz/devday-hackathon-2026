import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronRight, Download, MapPin, MessageSquareText, Pause, Play, RotateCcw, ShieldCheck, Sparkles, UsersRound } from "lucide-react";

type Outcome = "urgent" | "duplicate" | "census" | "missing";
type Review = "waiting" | "confirmed" | "kept-separate";

type ReplayEvent = {
  id: string;
  source: "WhatsApp export" | "SMS relay" | "Phone report";
  volunteer: string;
  time: string;
  location: string;
  message: string;
  image?: string;
  outcome: Outcome;
};

const fixture: ReplayEvent[] = [
  { id: "poppy", source: "WhatsApp export", volunteer: "Maya R.", time: "5:46 PM", location: "Flagler Yard demo area", message: "Split-face calico held up her front paw and did not come to food. Count: 6 adults.", image: "/demo-assets/poppy-calico-limp.png", outcome: "urgent" },
  { id: "marmalade", source: "SMS relay", volunteer: "Joel M.", time: "6:04 PM", location: "Little River Laundry demo area", message: "Orange tabby with white chin may be pregnant. Fed 7; one new gray cat behind bins.", image: "/demo-assets/marmalade-orange-tabby.png", outcome: "duplicate" },
  { id: "kittens", source: "Phone report", volunteer: "Rina P.", time: "6:31 PM", location: "Canal Commons demo area", message: "Maybe three kittens heard behind the fence. I could not safely count them.", outcome: "census" },
  { id: "tux", source: "WhatsApp export", volunteer: "Rina P.", time: "6:38 PM", location: "Riverwalk Lot demo area", message: "Tux did not return today. Last seen by shrubs near the footpath; white chest, paws, and small white nose spot.", image: "/demo-assets/tux-missing-search.png", outcome: "missing" },
];

const storageKey = "mangrove-mews-synthetic-replay-v1";

function outcomeCopy(outcome: Outcome) {
  switch (outcome) {
    case "urgent": return { label: "Urgent review", title: "Poppy · possible injury", detail: "Suggested colony: Flagler Yard · 82%. Vet review task created; a coordinator decides next steps." };
    case "duplicate": return { label: "Duplicate review", title: "Marmalade · possible same cat", detail: "Visual 91% · markings 96% · time/place 94%. The report stays separate until a coordinator decides." };
    case "census": return { label: "Census follow-up", title: "Canal Commons · uncertain kittens", detail: "Count stored as “maybe 3” with 54% confidence. No new cat record is created automatically." };
    case "missing": return { label: "Search review", title: "Tux · missing workflow", detail: "Private probability-search task proposed. A person approves volunteer assignments and public notices." };
  }
}

/**
 * Self-contained, browser-local hackathon replay. It uses deliberately fictional
 * input and browser storage only; it neither sends messages nor accesses WhatsApp.
 */
export function SyntheticOperationsReplay() {
  const [step, setStep] = useState(0);
  const [duplicateReview, setDuplicateReview] = useState<Review>("waiting");
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
      if (Number.isInteger(saved.step)) setStep(Math.max(0, Math.min(fixture.length, saved.step)));
      if (["waiting", "confirmed", "kept-separate"].includes(saved.duplicateReview)) setDuplicateReview(saved.duplicateReview);
    } catch { /* A demo should never fail because browser storage is unavailable. */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(storageKey, JSON.stringify({ step, duplicateReview }));
  }, [step, duplicateReview, loaded]);

  useEffect(() => {
    if (!playing) return;
    if (step >= fixture.length) { setPlaying(false); return; }
    const timer = window.setTimeout(() => setStep((value) => Math.min(fixture.length, value + 1)), 1800);
    return () => window.clearTimeout(timer);
  }, [playing, step]);

  const processed = fixture.slice(0, step);
  const current = fixture[step];
  const urgent = processed.filter((event) => event.outcome === "urgent").length;
  const feederVisit = processed.some((event) => event.id === "marmalade");
  const currentCopy = current ? outcomeCopy(current.outcome) : null;
  const canDownload = processed.length > 0;
  const duplicateProcessed = processed.some((event) => event.outcome === "duplicate");

  const rollup = useMemo(() => ({
    processed: processed.length,
    urgent,
    feedings: feederVisit ? 1 : 0,
    openReviews: urgent + (duplicateProcessed && duplicateReview === "waiting" ? 1 : 0) + processed.filter((event) => event.outcome === "census" || event.outcome === "missing").length,
  }), [duplicateProcessed, duplicateReview, feederVisit, processed, urgent]);

  function replayNext() { setStep((value) => Math.min(fixture.length, value + 1)); }
  function reset() { setPlaying(false); setStep(0); setDuplicateReview("waiting"); localStorage.removeItem(storageKey); }
  function downloadRollup() {
    const report = {
      title: "Mangrove Mews synthetic sponsor/city rollup",
      disclaimer: "Fictional hackathon fixture only. No real cats, people, locations, or messages.",
      generatedAt: new Date().toISOString(),
      rollup: { catsInCensus: 142, fixedOrEarTipped: 109, tnrPending: 21, medicalCasesResolved: 6, activeReviews: rollup.openReviews, feederVisitsInReplay: rollup.feedings },
      replayedFixtureEvents: processed.map(({ id, source, time, outcome }) => ({ id, source, time, outcome })),
      duplicateDecision: duplicateReview,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "mangrove-mews-synthetic-rollup.json"; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return <section className="synthetic-replay panel" aria-labelledby="synthetic-replay-title">
    <header className="synthetic-replay-heading">
      <div><p className="eyebrow">Interactive local demo</p><h2 id="synthetic-replay-title">Replay a synthetic field shift</h2><p>Each click processes one made-up intentional report. This simulation runs only in this browser and never reads a live chat, sends a message, or changes a real record.</p></div>
      <div className="replay-controls"><span><ShieldCheck size={16}/>Fictional fixture only</span><button className="secondary-button" disabled={step >= fixture.length} onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={15}/> : <Play size={15}/>}{playing ? "Pause replay" : "Start live replay"}</button></div>
    </header>

    <div className="replay-summary" aria-live="polite">
      <div><b>{rollup.processed} / {fixture.length}</b><small>fixture reports processed</small></div>
      <div><b>{rollup.urgent}</b><small>urgent review today</small></div>
      <div><b>{rollup.feedings}</b><small>feeder visit logged</small></div>
      <div><b>{rollup.openReviews}</b><small>human decisions open</small></div>
    </div>

    <div className="replay-grid">
      <section className="replay-thread" aria-label="Synthetic chat and relay history">
        <p className="eyebrow">Incoming fixture</p>
        {fixture.slice(0, Math.min(fixture.length, step + 1)).map((event, index) => <article key={event.id} className={index < step ? "replay-message processed" : "replay-message current"}>
          <header><span><MessageSquareText size={14}/>{event.source}</span><small>{event.time}</small></header>
          <b>{event.volunteer}</b><p>{event.message}</p>
          {event.image && <img src={event.image} alt="Fictional cat evidence for demo" />}
          <small className="replay-pin"><MapPin size={13}/>Approximate private demo pin · {event.location}</small>
          {index < step && <em><Check size={13}/>Triage suggestion added</em>}
        </article>)}
        {step < fixture.length - 1 && <p className="replay-awaiting"><Sparkles size={14}/>Waiting to reveal the next fictional report…</p>}
      </section>

      <section className="replay-action" aria-live="polite">
        <p className="eyebrow">Agentic triage preview</p>
        {current && currentCopy ? <><span className={`replay-outcome ${current.outcome}`}><Sparkles size={15}/>{currentCopy.label}</span><h3>{currentCopy.title}</h3><p>{currentCopy.detail}</p><div className="replay-evidence"><span>Message + pin</span><span>{current.image ? "Photo evidence" : "No photo supplied"}</span><span>Human review gate</span></div><button className="primary-button" onClick={replayNext}>Apply synthetic update <ChevronRight size={16}/></button></> : <><span className="replay-outcome complete"><Check size={15}/>Fixture complete</span><h3>Same-day operating picture updated</h3><p>The local state now reflects the synthetic reports. Use the human decision card for the potential duplicate, then download a privacy-safe sample rollup.</p><button className="secondary-button" onClick={reset}><RotateCcw size={15}/>Reset fixture</button></>}
      </section>

      <section className="replay-work">
        <p className="eyebrow">Coordinator work created</p>
        <article className={urgent ? "work-item urgent" : "work-item"}><AlertTriangle size={17}/><div><b>Poppy vet-review queue</b><small>{urgent ? "Added from photo, message and pin · needs coordinator decision" : "Waiting for synthetic injury report"}</small></div><strong>{urgent ? "Urgent" : "Waiting"}</strong></article>
        <article className={feederVisit ? "work-item complete" : "work-item"}><Check size={17}/><div><b>Little River feeder visit</b><small>{feederVisit ? "Joel · fed 7 · 6:04 PM · no retyping" : "Waiting for synthetic feeding confirmation"}</small></div><strong>{feederVisit ? "Logged" : "Waiting"}</strong></article>
        <article className={duplicateProcessed ? "work-item review" : "work-item"}><UsersRound size={17}/><div><b>Marmalade match decision</b><small>{duplicateProcessed ? "Two reports are still separate. Only a coordinator can merge." : "Waiting for synthetic duplicate evidence"}</small></div><strong>{duplicateProcessed ? "Review" : "Waiting"}</strong></article>
        {duplicateProcessed && <div className="duplicate-gate"><b>Human confirmation required</b><p>Do these fictional reports describe the same cat?</p><div><button className={duplicateReview === "confirmed" ? "selected" : ""} onClick={() => setDuplicateReview("confirmed")}>Confirm same cat</button><button className={duplicateReview === "kept-separate" ? "selected" : ""} onClick={() => setDuplicateReview("kept-separate")}>Keep records separate</button></div><small>{duplicateReview === "waiting" ? "No action has been taken." : duplicateReview === "confirmed" ? "Demo decision saved locally; census remains one cat after review." : "Demo decision saved locally; both records stay separate."}</small></div>}
      </section>
    </div>

    <section className="replay-census" aria-label="Replay colony census">
      <p className="eyebrow">Local replay census · synthetic baseline</p>
      <div className="table-scroll"><table><thead><tr><th>Colony</th><th>Cats</th><th>Fixed</th><th>TNR pending</th><th>Vet / review</th><th>Last feeding</th></tr></thead><tbody>
        <tr><td><b>Flagler Yard</b></td><td>9</td><td>7</td><td>1</td><td>{urgent ? "Poppy · urgent vet review" : "No new report"}</td><td>Maya · today</td></tr>
        <tr><td><b>Little River Laundry</b></td><td>12</td><td>9</td><td>2</td><td>{feederVisit ? "Marmalade · possible pregnancy" : "Monitoring"}</td><td>{feederVisit ? "Joel · 6:04 PM · fed 7" : "Joel · yesterday"}</td></tr>
        <tr><td><b>Canal Commons</b></td><td>16</td><td>11</td><td>4</td><td>{processed.some((event) => event.id === "kittens") ? "Maybe 3 kittens · unconfirmed" : "Monitoring"}</td><td>Rina · 2 days ago</td></tr>
        <tr><td><b>Riverwalk Lot</b></td><td>7</td><td>5</td><td>2</td><td>{processed.some((event) => event.id === "tux") ? "Tux · search review" : "Monitoring"}</td><td>Ana · today</td></tr>
      </tbody></table></div>
      <small>Replay state is saved on this device only; the main dashboard is a separate fixture.</small>
    </section>

    <footer className="sponsor-rollup"><div><p className="eyebrow">Sponsor / city-safe rollup</p><b>142 cats · 109 fixed / ear-tipped · 21 TNR pending</b><small>Aggregated synthetic counts only. Feeder names, contact details, photos, and precise pins are not included.</small></div><button className="secondary-button" disabled={!canDownload} onClick={downloadRollup}><Download size={15}/>Download sample rollup</button></footer>
  </section>;
}
