import { useState } from "react";
import { Database, RefreshCw } from "lucide-react";

type Report = { trace_id: string; observation_id: string; source_kind: string; body_redacted: string; broad_area: string; attachment_manifest_json: string; proposed_colony_key: string | null; proposed_cat_key: string | null; duplicate_group: string | null; urgency: string };
type Review = { id: string; observation_id: string; review_kind: string; status: string; explanation: string };
type Visit = { colony_key: string; feeder_alias: string; headcount: number | null; visited_at: string };
type Snapshot = { reports: Report[]; reviews: Review[]; feedings: Visit[] };
type Assignment = { id: string; colony_key: string; assigned_user_id: number; due_at: string; status: string; overdue: boolean };

function csrf() { return document.cookie.split("; ").find((cookie) => cookie.startsWith("mews_csrf="))?.slice("mews_csrf=".length) ?? ""; }

export function SharedIntake() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [message, setMessage] = useState("The separate server account requires a provisioned user and a configured Worker database.");
  const [working, setWorking] = useState(false);
  const [start, setStart] = useState("2026-11-01");
  const [end, setEnd] = useState("2026-11-30");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [colony, setColony] = useState("COL-02");
  const [assignee, setAssignee] = useState("1");
  const [due, setDue] = useState("2026-11-08T18:00");

  async function request(path: string, options: RequestInit = {}) {
    const response = await fetch(path, { ...options, credentials: "same-origin" });
    if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Worker API unavailable; start the configured Worker instead of Vite-only mode.");
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
    return body;
  }
  async function refresh() {
    try { setSnapshot(await request("/api/private/intake") as Snapshot); const tasks = await request("/api/private/feeding-assignments") as { assignments: Assignment[] }; setAssignments(tasks.assignments); setMessage("Loaded private synthetic intake from D1."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load intake."); }
  }
  async function login(event: React.FormEvent) {
    event.preventDefault(); setWorking(true);
    try { await request("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }); setPassword(""); setSignedIn(true); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Sign-in failed."); }
    finally { setWorking(false); }
  }
  async function loadBatch() {
    setWorking(true);
    try {
      const fixtureResponse = await fetch("/demo-data/synthetic-intake-batch.json");
      if (!fixtureResponse.ok) throw new Error("Synthetic fixture unavailable.");
      const fixture = await fixtureResponse.json();
      const result = await request("/api/private/synthetic-import", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf() }, body: JSON.stringify(fixture) });
      setMessage(`Imported ${result.reportsImported} fictional reports with source trace IDs.`); await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Import failed."); }
    finally { setWorking(false); }
  }
  async function decide(id: string, decision: "confirmed" | "kept_separate") {
    setWorking(true);
    try { const result = await request("/api/private/reviews/decision", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf() }, body: JSON.stringify({ id, decision }) }); await refresh(); setMessage(result.note); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Review failed."); }
    finally { setWorking(false); }
  }
  async function createAssignment(event: React.FormEvent) {
    event.preventDefault(); setWorking(true);
    try { await request("/api/private/feeding-assignments", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf() }, body: JSON.stringify({ colonyKey: colony, assignedUserId: Number(assignee), dueAt: new Date(due).toISOString() }) }); await refresh(); setMessage("Feeding assignment created."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create assignment."); }
    finally { setWorking(false); }
  }
  async function updateAssignment(id: string, action: "complete" | "reassign") {
    setWorking(true);
    try { await request("/api/private/feeding-assignments/update", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf() }, body: JSON.stringify({ id, action, assignedUserId: Number(assignee) }) }); await refresh(); setMessage(action === "complete" ? "Feeding assignment completed." : "Feeding assignment reassigned."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update assignment."); }
    finally { setWorking(false); }
  }
  function fixtureImages(report: Report) {
    try { const attachments = JSON.parse(report.attachment_manifest_json) as { fixturePath?: string }[]; return attachments.map((item) => item.fixturePath).filter((path): path is string => typeof path === "string" && /^\/demo-assets\/[a-z0-9-]+\.(png|jpg|jpeg|webp)$/i.test(path)); } catch { return []; }
  }
  return <section className="panel shared-intake" aria-labelledby="shared-intake-title">
    <div className="panel-heading"><div><p className="eyebrow">Worker + D1 · fictional fixture</p><h2 id="shared-intake-title">Shared intake workspace</h2></div><Database size={20}/></div>
    <p>This workspace uses a separately provisioned server account. Demo persona credentials do not grant access. No live WhatsApp connection is used.</p>
    {!signedIn ? <form className="shared-login" onSubmit={login}><label className="field-label">Server account email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label className="field-label">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button className="primary-button" disabled={working}>Sign in to Worker</button></form> : <div className="shared-actions"><button className="primary-button" onClick={() => void loadBatch()} disabled={working}>Import fictional batch</button><button className="secondary-button" onClick={() => void refresh()}><RefreshCw size={14}/>Refresh</button></div>}
    <p role="status">{message}</p>
    {signedIn && <div className="shared-login"><label className="field-label">Report start<input type="date" value={start} onChange={(event) => setStart(event.target.value)}/></label><label className="field-label">Report end<input type="date" value={end} onChange={(event) => setEnd(event.target.value)}/></label><a className="secondary-button" href={`/api/private/reports/synthetic.csv?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`}>Download aggregate CSV</a></div>}
    {signedIn && <section className="shared-schedule"><p className="eyebrow">Feeding schedule · coordinator actions</p><form className="shared-login" onSubmit={createAssignment}><label className="field-label">Colony ID<input value={colony} onChange={(event) => setColony(event.target.value)} required/></label><label className="field-label">Assigned user ID<input type="number" min="1" value={assignee} onChange={(event) => setAssignee(event.target.value)} required/></label><label className="field-label">Due date and time<input type="datetime-local" value={due} onChange={(event) => setDue(event.target.value)} required/></label><button className="secondary-button" disabled={working}>Schedule feeding</button></form><p>Reassign uses the user ID above. Check weather and safe access before assigning field work.</p>{assignments.map((item) => <article className="shared-assignment" key={item.id}><span><b>{item.colony_key} · user {item.assigned_user_id}</b><small>{new Date(item.due_at).toLocaleString()} · {item.overdue ? "Overdue" : item.status}</small></span>{item.status === "scheduled" && <div className="shared-actions"><button className="secondary-button" disabled={working} onClick={() => void updateAssignment(item.id, "complete")}>Complete</button><button className="secondary-button" disabled={working} onClick={() => void updateAssignment(item.id, "reassign")}>Reassign</button></div>}</article>)}</section>}
    {snapshot && <><p><b>{snapshot.reports.length}</b> source-linked reports · <b>{snapshot.reviews.filter((review) => review.status === "open").length}</b> reviews open · <b>{snapshot.feedings.length}</b> feeding visits</p><div className="shared-report-list">{snapshot.reports.map((report) => <article key={report.trace_id}><p className="eyebrow">{report.source_kind.replaceAll("_", " ")} · {report.broad_area} · {report.urgency}</p><p>{report.body_redacted}</p>{fixtureImages(report).map((src) => <img className="shared-fixture-photo" key={src} src={src} alt="Fictional cat evidence"/>)}<small>Trace {report.trace_id} · colony {report.proposed_colony_key ?? "unmatched"} · cat {report.proposed_cat_key ?? "unmatched"}</small>{snapshot.reviews.filter((review) => review.observation_id === report.observation_id && review.review_kind === "possible_duplicate").map((review) => <div className="shared-review" key={review.id}><b>Possible duplicate · {review.status}</b><p>{review.explanation}</p>{report.duplicate_group && <div className="shared-actions">{snapshot.reports.filter((other) => other.duplicate_group === report.duplicate_group).flatMap((other) => fixtureImages(other).map((src) => <figure key={`${other.trace_id}-${src}`}><img className="shared-fixture-photo" src={src} alt={`Fictional evidence for ${other.trace_id}`}/><figcaption>{other.trace_id}</figcaption></figure>))}</div>}{review.status === "open" && <div className="shared-actions"><button type="button" className="secondary-button" disabled={working} onClick={() => void decide(review.id, "confirmed")}>Confirm suggestion</button><button type="button" className="secondary-button" disabled={working} onClick={() => void decide(review.id, "kept_separate")}>Keep separate</button></div>}<small>The decision is recorded; automatic record merging is not implemented.</small></div>)}</article>)}</div></>}
  </section>;
}
