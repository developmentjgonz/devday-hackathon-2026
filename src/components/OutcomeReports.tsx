import { useCallback, useEffect, useState } from "react";
import { Download, HeartPulse, Plus, RefreshCw } from "lucide-react";
import { privateJson } from "../lib/private-api";
type Case = { id: string; cat_key: string; case_kind: "medical" | "tnr"; priority: string; title: string; detail: string; status: "open" | "resolved"; outcome: string | null; evidence_note: string | null };
type Session = { user: { role: string } };
type Cat = { cat_key: string; name: string; status: string };
type Report = { metrics: Record<string, number>; disclaimer: string };
export function OutcomeReports() {
  const [session, setSession] = useState<Session | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Sign in to see documented care outcomes.");
  const [from, setFrom] = useState("2026-11-01");
  const [to, setTo] = useState("2026-11-30");
  const [draft, setDraft] = useState({ canonicalCatKey: "CAT-04", caseKind: "medical", priority: "urgent", title: "", detail: "" });
  const [resolution, setResolution] = useState({ id: "", outcome: "medical_resolved", evidenceNote: "" });
  const manager = session?.user.role === "admin" || session?.user.role === "coordinator";
  const sponsor = session?.user.role === "sponsor";
  const canReport = manager || sponsor;
  const query = new URLSearchParams({ from, to }).toString();
  const refresh = useCallback(async () => {
    if (!session || !from || !to || from > to) return;
    try {
      if (session.user.role !== "sponsor") setCases((await privateJson("/api/private/care-cases?" + new URLSearchParams({ from, to }))).cases);
      if (["admin", "coordinator", "sponsor"].includes(session.user.role)) setReport(await privateJson("/api/private/reports/outcomes?" + new URLSearchParams({ from, to })));
      if (["admin", "coordinator"].includes(session.user.role)) setCats((await privateJson("/api/private/census")).cats.filter((cat: Cat) => cat.status !== "merged"));
      setNotice("Stored care records refreshed. Pending counts are current; outcome totals use the selected date window.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Care records unavailable"); }
  }, [session, from, to]);
  useEffect(() => { void privateJson("/api/auth/session").then(setSession).catch(() => undefined); }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      await privateJson("/api/private/care-cases", draft);
      setDraft((current) => ({ ...current, title: "", detail: "" }));
      await refresh(); dispatchEvent(new Event("mews-data-changed"));
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not create case"); }
    finally { setBusy(false); }
  }
  async function resolve(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      await privateJson("/api/private/care-cases/resolve", resolution);
      setResolution({ id: "", outcome: "medical_resolved", evidenceNote: "" });
      await refresh(); dispatchEvent(new Event("mews-data-changed"));
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not record outcome"); }
    finally { setBusy(false); }
  }
  const selected = cases.find((item) => item.id === resolution.id);
  return <section className="outcome-reports panel">
    <header><div><p className="eyebrow">Documented outcomes</p><h2>Care and TNR follow-through</h2><p>A coordinator records the outcome and evidence. Unknown stays unknown.</p></div><button className="secondary-button" onClick={() => void refresh()}><RefreshCw size={15}/>Refresh</button></header>
    {session && <div className="shared-actions"><label className="field-label">From date<input type="date" value={from} onChange={(event) => setFrom(event.target.value)}/></label><label className="field-label">Through date<input type="date" value={to} onChange={(event) => setTo(event.target.value)}/></label>{canReport && <a className="secondary-button" href={"/api/private/reports/outcomes.csv?" + query}><Download size={15}/>Download outcomes CSV</a>}</div>}
    <p role="status">{notice}</p>
    {report && <div className="outcome-metrics"><div><HeartPulse size={17}/><b>{report.metrics.documented_medical_cases_resolved_in_window}</b><small>documented medical resolutions in window</small></div><div><b>{report.metrics.tnr_pending_now}</b><small>TNR cases pending now</small></div><div><b>{report.metrics.documented_tnr_completed_in_window}</b><small>documented TNR completions in window</small></div></div>}
    <div className="outcome-layout" style={!manager ? { display: "block" } : undefined}>
      {manager && <form className="outcome-form" onSubmit={(event) => void create(event)}><p className="eyebrow">Open a fictional care case</p>
        <label>Cat record<select value={draft.canonicalCatKey} onChange={(event) => setDraft({ ...draft, canonicalCatKey: event.target.value })}>{cats.map((cat) => <option key={cat.cat_key} value={cat.cat_key}>{cat.name}</option>)}</select></label>
        <label>Care type<select value={draft.caseKind} onChange={(event) => setDraft({ ...draft, caseKind: event.target.value })}><option value="medical">Medical care</option><option value="tnr">TNR</option></select></label>
        <label>Priority<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}><option value="urgent">Urgent</option><option value="normal">Normal</option><option value="monitor">Monitor</option></select></label>
        <label>Short title<input required maxLength={140} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })}/></label>
        <label>What was observed?<textarea required maxLength={1200} value={draft.detail} onChange={(event) => setDraft({ ...draft, detail: event.target.value })}/></label>
        <button className="primary-button" disabled={busy || !cats.length}><Plus size={15}/>Open for human review</button>
      </form>}
      {session && !sponsor && <section className="outcome-cases"><p className="eyebrow">Care cases opened in selected window</p>{cases.length === 0 && <p>No stored care cases in this window.</p>}{cases.map((item) => <article key={item.id} className={item.status}><HeartPulse size={17}/><div><b>{item.title}</b><small>{item.cat_key} · {item.case_kind} · {item.outcome?.replaceAll("_", " ") ?? "Awaiting documented outcome"}</small><p>{item.detail}</p>{item.evidence_note && <p>Evidence: {item.evidence_note}</p>}</div>{manager && item.status === "open" && <button className="secondary-button" onClick={() => setResolution({ id: item.id, outcome: item.case_kind === "medical" ? "medical_resolved" : "tnr_completed", evidenceNote: "" })}>Record outcome</button>}</article>)}</section>}
    </div>
    {manager && selected && <form className="outcome-form" onSubmit={(event) => void resolve(event)}><h3>Document outcome: {selected.title}</h3><label>Outcome<select value={resolution.outcome} onChange={(event) => setResolution({ ...resolution, outcome: event.target.value })}>{selected.case_kind === "medical" ? <option value="medical_resolved">Medical case resolved</option> : <><option value="tnr_completed">TNR completed</option><option value="tnr_not_completed">TNR not completed</option></>}<option value="monitoring">Continue monitoring</option></select></label><label>Documented evidence<textarea required maxLength={1200} value={resolution.evidenceNote} onChange={(event) => setResolution({ ...resolution, evidenceNote: event.target.value })}/></label><button className="primary-button" disabled={busy}>Save documented outcome</button></form>}
    {report && <footer>{report.disclaimer}</footer>}
  </section>;
}
