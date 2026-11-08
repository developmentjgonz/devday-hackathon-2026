import { useCallback, useEffect, useState } from "react";
type Assignment = { id: string; colony_key: string; assigned_user_id: number; due_at: string; status: string; overdue: boolean };
type Member = { id: number; email: string };
function csrf() { return document.cookie.split("; ").find((value) => value.startsWith("mews_csrf="))?.slice(10) ?? ""; }
export function FieldSchedule() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [colonies, setColonies] = useState<{ colony_key: string; broad_area: string }[]>([]);
  const [manager, setManager] = useState(false);
  const [colony, setColony] = useState("");
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState("");
  const [notice, setNotice] = useState("Loading feeding assignments…");
  const [busy, setBusy] = useState(false);
  const api = useCallback(async (path: string, options: RequestInit = {}) => {
    const response = await fetch(path, { ...options, credentials: "same-origin" });
    if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Backend unavailable");
    const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Request failed"); return body;
  }, []);
  const refresh = useCallback(async () => {
    try {
      const session = await api("/api/auth/session"); const canManage = ["admin", "coordinator"].includes(session.user.role); setManager(canManage);
      const tasks = await api("/api/private/feeding-assignments"); setAssignments(tasks.assignments);
      const census = await api("/api/private/census"); setColonies(census.colonies); setColony((value) => value || census.colonies[0]?.colony_key || "");
      if (canManage) { const team = await api("/api/private/team"); setMembers(team.members); setAssignee((value) => value || String(team.members[0]?.id ?? "")); }
      setNotice("Assignments are stored by the backend. Overdue visits are highlighted below.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to load assignments."); }
  }, [api]);
  useEffect(() => { void refresh(); }, [refresh]);
  async function mutate(path: string, body: object) {
    setBusy(true);
    try { await api(path, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf() }, body: JSON.stringify(body) }); await refresh(); dispatchEvent(new Event("mews-data-changed")); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Assignment failed."); }
    finally { setBusy(false); }
  }
  return <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Feeder coverage</p><h1>Feeding schedule</h1></div><button className="secondary-button" onClick={() => void refresh()}>Refresh</button></div><p role="status">{notice}</p>{manager && <form className="shared-login" onSubmit={(event) => { event.preventDefault(); void mutate("/api/private/feeding-assignments", { colonyKey: colony, assignedUserId: Number(assignee), dueAt: new Date(due).toISOString() }); }}><label className="field-label">Stored colony<select value={colony} onChange={(event) => setColony(event.target.value)} required><option value="">Import a colony first</option>{colonies.map((item) => <option key={item.colony_key} value={item.colony_key}>{item.broad_area} · {item.colony_key}</option>)}</select></label><label className="field-label">Team member<select value={assignee} onChange={(event) => setAssignee(event.target.value)} required>{members.map((member) => <option key={member.id} value={member.id}>{member.email}</option>)}</select></label><label className="field-label">Due date and time<input type="datetime-local" required value={due} onChange={(event) => setDue(event.target.value)}/></label><button className="primary-button" disabled={busy || !colony}>Schedule visit</button></form>}<p className="source-note">Review weather and public access before leaving. Overdue does not confirm a missed feeding; contact the assigned team member first.</p>{assignments.map((item) => <article className="shared-assignment" key={item.id}><span><b>{item.colony_key} · {item.overdue ? "OVERDUE · confirmation needed" : item.status}</b><small>{new Date(item.due_at).toLocaleString()} · {members.find((member) => member.id === item.assigned_user_id)?.email ?? "Assigned team member"}</small></span>{item.status === "scheduled" && <div className="shared-actions"><button className="secondary-button" disabled={busy} onClick={() => void mutate("/api/private/feeding-assignments/update", { id: item.id, action: "complete" })}>Confirm visit completed</button>{manager && <button className="secondary-button" disabled={busy || !assignee} onClick={() => void mutate("/api/private/feeding-assignments/update", { id: item.id, action: "reassign", assignedUserId: Number(assignee) })}>Reassign to selected member</button>}</div>}</article>)}</section>;
}
