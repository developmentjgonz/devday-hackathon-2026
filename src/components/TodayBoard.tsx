import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CalendarClock, HeartPulse, LogIn, RefreshCw, ShieldAlert, UsersRound } from "lucide-react";
import "./TodayBoard.css";

type Role = "admin" | "coordinator" | "volunteer" | "sponsor";
type Session = { user: { id: number; email: string; role: Role } };
type Report = {
  observation_id: string; trace_id: string; source_kind: string; volunteer_alias?: string | null; body_redacted: string; broad_area: string; received_at: string;
  proposed_cat_key?: string | null; canonical_cat_key?: string | null; proposed_colony_key?: string | null; assigned_colony_key?: string | null; assignment_state?: string | null;
  urgency?: string | null; uncertainty_note?: string | null;
};
type Review = { observation_id: string; review_kind: string; status: string; explanation?: string | null };
type Assignment = { id: string; colony_key: string; assigned_user_id: number; due_at: string; status: string; overdue?: boolean };
type CareCase = { id: string; cat_key: string; case_kind: string; priority: string; title: string; status: string; detail?: string; opened_at?: string; };
type Census = { colonies?: { cat_count?: number; tnr_pending?: number; needs_vet?: number }[] };
type Outcomes = { metrics?: { documented_medical_cases_resolved_in_window?: number; tnr_pending_now?: number; medical_open_now?: number } };
type Intake = { reports?: Report[]; reviews?: Review[] };

type Attention = { key: string; observationId: string; category: string; priority: number; area: string; reporter: string; receivedAt: string; quote: string; sources: number; reviewNote?: string };
const categoryOrder: Record<string, number> = { Injury: 0, Pregnancy: 1, Kittens: 2, "Feeder gap": 3, "Urgent review": 4 };

async function asJson<T>(result: PromiseSettledResult<Response>): Promise<T | null> {
  if (result.status !== "fulfilled" || !result.value.ok) return null;
  return result.value.json() as Promise<T>;
}

function urgencyCategory(report: Report, review?: Review) {
  const text = `${report.body_redacted} ${report.uncertainty_note ?? ""} ${review?.review_kind ?? ""} ${review?.explanation ?? ""}`.toLowerCase();
  // Demo text can be English, Spanish, Haitian Creole, or Portuguese. These cues label a
  // queue item only; an open urgent_care review is still required before it is shown.
  if (/injur|limp|bleed|wound|hurt|cojea|cojear|mancando|ferid|machuc|sangra/.test(text)) return "Injury";
  if (/pregnan|belly.*larger|preñad|prenad|gestante|grávida|gravida/.test(text)) return "Pregnancy";
  if (/kitten|gatit|filhote/.test(text)) return "Kittens";
  if (/feeder.*(gap|lost|available)|no feeder|sin alimentador|sem alimentador/.test(text)) return "Feeder gap";
  return "Urgent review";
}

function when(value?: string) {
  if (!value) return "Time not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time not recorded" : date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function go(anchor: string, observationId?: string) {
  if (observationId && anchor === "intake-review") sessionStorage.setItem("mews-review-observation", observationId);
  location.hash = anchor;
}

function scrollToTeamSignIn() {
  document.getElementById("shared-intake-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function BoardLink({ to, observationId, children }: { to: string; observationId?: string; children: React.ReactNode }) {
  return <button type="button" className="today-link" onClick={() => go(to, observationId)}>{children}<ArrowRight size={15}/></button>;
}

export function TodayBoard() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [careCases, setCareCases] = useState<CareCase[] | null>(null);
  const [census, setCensus] = useState<Census | null>(null);
  const [outcomes, setOutcomes] = useState<Outcomes | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [notice, setNotice] = useState("Checking your team session…");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", { credentials: "same-origin" });
      if (!response.ok) { setSession(null); setIntake(null); setAssignments(null); setCareCases(null); setCensus(null); setOutcomes(null); setNotice("Sign in to view private operations."); return; }
      const nextSession = await response.json() as Session;
      setSession(nextSession);
      if (nextSession.user.role === "sponsor") {
        setIntake(null); setAssignments(null); setCareCases(null);
        const settled = await Promise.allSettled([
          fetch("/api/private/census", { credentials: "same-origin" }),
          fetch("/api/private/reports/outcomes", { credentials: "same-origin" }),
        ]);
        const [safeCensus, safeOutcomes] = await Promise.all(settled.map(asJson));
        setCensus(safeCensus as Census | null); setOutcomes(safeOutcomes as Outcomes | null);
        setIntake(null); setAssignments(null); setCareCases(null);
        setNotice("Sponsor view shows aggregate synthetic outcomes only."); setUpdatedAt(new Date().toISOString()); return;
      }
      const settled = await Promise.allSettled([
        fetch("/api/private/intake", { credentials: "same-origin" }),
        fetch("/api/private/feeding-assignments", { credentials: "same-origin" }),
        fetch("/api/private/care-cases", { credentials: "same-origin" }),
      ]);
      const [nextIntake, nextAssignments, nextCases] = await Promise.all(settled.map(asJson));
      setIntake(nextIntake as Intake | null);
      setAssignments((nextAssignments as { assignments?: Assignment[] } | null)?.assignments ?? null);
      setCareCases((nextCases as { cases?: CareCase[] } | null)?.cases ?? null);
      setCensus(null); setOutcomes(null);
      setUpdatedAt(new Date().toISOString());
      setNotice("Shared operations view. Counts appear only when their protected source returned.");
    } catch {
      setSession(null); setIntake(null); setAssignments(null); setCareCases(null); setCensus(null); setOutcomes(null);
      setNotice("Operations data is unavailable. Start the local full demo server, then refresh.");
    }
  }, []);

  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 30_000); const changed = () => void refresh(); addEventListener("mews-data-changed", changed); return () => { clearInterval(timer); removeEventListener("mews-data-changed", changed); }; }, [refresh]);

  const attention = useMemo(() => {
    if (!intake) return [];
    const reviews = new Map((intake.reviews ?? []).filter((review) => review.status === "open" && review.review_kind === "urgent_care").map((review) => [review.observation_id, review]));
    const grouped = new Map<string, Attention>();
    for (const report of intake.reports ?? []) {
      const review = reviews.get(report.observation_id);
      if (!review) continue;
      const category = urgencyCategory(report, review);
      const key = `${report.canonical_cat_key ?? report.proposed_cat_key ?? "unmatched"}:${report.assigned_colony_key ?? report.proposed_colony_key ?? report.broad_area}:${category}`;
      const prior = grouped.get(key);
      if (!prior || Date.parse(report.received_at) > Date.parse(prior.receivedAt)) {
        grouped.set(key, { key, observationId: report.observation_id, category, priority: categoryOrder[category], area: report.assigned_colony_key ?? report.proposed_colony_key ?? report.broad_area, reporter: report.volunteer_alias || "Team member", receivedAt: report.received_at, quote: report.body_redacted, sources: (prior?.sources ?? 0) + 1, reviewNote: review?.explanation ?? undefined });
      } else grouped.set(key, { ...prior, sources: prior.sources + 1 });
    }
    return [...grouped.values()].sort((a, b) => a.priority - b.priority || Date.parse(b.receivedAt) - Date.parse(a.receivedAt));
  }, [intake]);

  const uncertain = useMemo(() => (intake?.reports ?? []).filter((report) => report.assignment_state !== "confirmed" && (report.uncertainty_note || !report.proposed_colony_key || !report.proposed_cat_key || report.assignment_state === "unmatched")), [intake]);
  const overdue = useMemo(() => (assignments ?? []).filter((item) => item.overdue || (item.status === "scheduled" && Date.parse(item.due_at) < Date.now())), [assignments]);
  const nextAssignments = useMemo(() => (assignments ?? []).filter((item) => item.status === "scheduled" && !(item.overdue || Date.parse(item.due_at) < Date.now())).sort((a, b) => Date.parse(a.due_at) - Date.parse(b.due_at)).slice(0, 4), [assignments]);
  const openMedical = useMemo(() => (careCases ?? []).filter((item) => item.status === "open" && item.case_kind === "medical"), [careCases]);

  if (session === undefined) return <section className="today-board today-loading" aria-live="polite"><RefreshCw className="today-spin" size={18}/><span>{notice}</span></section>;
  if (session === null) return <section className="today-board today-login"><div><p className="today-kicker">Today’s operations</p><h2>One shared view for field care.</h2><p>Sign in to see the fictional team’s private queue, assigned visits, and documented care work.</p></div><button type="button" className="today-link" onClick={scrollToTeamSignIn}><LogIn size={16}/>Sign in through Team census</button></section>;
  if (session.user.role === "sponsor") {
    const colonies = census?.colonies?.length;
    const tnr = outcomes?.metrics?.tnr_pending_now;
    const medical = outcomes?.metrics?.documented_medical_cases_resolved_in_window;
    return <section className="today-board today-sponsor" aria-live="polite"><header><div><p className="today-kicker">Sponsor-safe snapshot</p><h2>Aggregate care outcomes</h2><p>{notice}</p></div><button className="today-refresh" onClick={() => void refresh()} aria-label="Refresh sponsor snapshot"><RefreshCw size={16}/></button></header><div className="today-metrics"><div><b>{colonies ?? "—"}</b><span>fictional broad-area colonies</span></div><div><b>{tnr ?? "—"}</b><span>TNR cases pending now</span></div><div><b>{medical ?? "—"}</b><span>documented medical resolutions</span></div></div><p className="today-boundary">No individual cats, feeders, raw messages, photos, live tags, or precise locations appear in this view.</p><BoardLink to="outcomes">Open aggregate outcomes</BoardLink></section>;
  }

  return <section className="today-board" aria-labelledby="today-board-title"><header><div><p className="today-kicker">Today’s operations · private team view</p><h2 id="today-board-title">Field care at a glance</h2><p>{notice}</p></div><button className="today-refresh" onClick={() => void refresh()} aria-label="Refresh operations board"><RefreshCw size={16}/></button></header><div className="today-summary"><div><AlertTriangle size={18}/><b>{intake ? attention.length : "—"}</b><span>urgent review groups</span></div><div><CalendarClock size={18}/><b>{assignments ? overdue.length : "—"}</b><span>feeding confirmations overdue</span></div><div><HeartPulse size={18}/><b>{careCases ? openMedical.length : "—"}</b><span>open medical cases</span></div><div><ShieldAlert size={18}/><b>{intake ? uncertain.length : "—"}</b><span>latest uncertain or unmatched</span></div></div><div className="today-grid">
    <section className="today-panel today-urgent"><header><div><AlertTriangle size={17}/><h3>Urgent queue</h3></div><BoardLink to="intake-review">Review intake</BoardLink></header>{attention.length ? attention.map((item) => <button type="button" className="today-item" key={item.key} onClick={() => go("intake-review", item.observationId)}><span className={`today-priority ${item.category.toLowerCase().replaceAll(" ", "-")}`}>{item.category}</span><div><b>{item.area}</b><p>“{item.quote}”</p><small>{item.reporter} · {when(item.receivedAt)}{item.sources > 1 ? ` · ${item.sources} source reports` : ""}</small>{item.reviewNote && <em>{item.reviewNote}</em>}</div><ArrowRight size={16}/></button>) : <p className="today-empty">{intake ? "No urgent reports returned by the protected intake source." : "Intake data was unavailable; no count is shown."}</p>}</section>
    <section className="today-panel"><header><div><CalendarClock size={17}/><h3>Feeding coverage</h3></div><BoardLink to="schedule">Open schedule</BoardLink></header>{overdue.map((item) => <button type="button" className="today-item" key={item.id} onClick={() => go("schedule", item.id)}><span className="today-priority overdue">Confirm</span><div><b>{item.colony_key}</b><p>Scheduled feed needs a human confirmation; overdue does not prove a missed feeding.</p><small>Due {when(item.due_at)}</small></div><ArrowRight size={16}/></button>)}{nextAssignments.map((item) => <button type="button" className="today-item" key={item.id} onClick={() => go("schedule", item.id)}><span className="today-priority next">Next</span><div><b>{item.colony_key}</b><p>Upcoming assigned feeding visit.</p><small>Due {when(item.due_at)}</small></div><ArrowRight size={16}/></button>)}{assignments === null ? <p className="today-empty">Feeding assignments were unavailable; no count is shown.</p> : !overdue.length && !nextAssignments.length && <p className="today-empty">No assigned feeding visits returned for this account.</p>}</section>
    <section className="today-panel"><header><div><ShieldAlert size={17}/><h3>Needs clarification</h3></div><BoardLink to="intake-review">Open review</BoardLink></header>{uncertain.length ? uncertain.slice(0, 4).map((item) => <button type="button" className="today-item" key={item.observation_id} onClick={() => go("intake-review", item.observation_id)}><span className="today-priority uncertain">Review</span><div><b>{item.broad_area}</b><p>“{item.uncertainty_note || item.body_redacted}”</p><small>{!item.proposed_colony_key ? "Unmatched colony" : !item.proposed_cat_key ? "Unmatched cat" : "Uncertain observation"} · {when(item.received_at)}</small></div><ArrowRight size={16}/></button>) : <p className="today-empty">{intake ? "No uncertain or unmatched reports returned." : "Intake data was unavailable; no count is shown."}</p>}</section>
    <section className="today-panel"><header><div><HeartPulse size={17}/><h3>Care follow-through</h3></div><BoardLink to="outcomes">Document outcomes</BoardLink></header>{openMedical.length ? openMedical.slice(0, 4).map((item) => <button type="button" className="today-item" key={item.id} onClick={() => go("outcomes", item.id)}><span className="today-priority medical">Medical</span><div><b>{item.title}</b><p>{item.detail || "A documented outcome is still needed."}</p><small>{item.cat_key} · opened {when(item.opened_at)}</small></div><ArrowRight size={16}/></button>) : careCases !== null ? <p className="today-empty">No open medical cases returned.</p> : <p className="today-empty">Care cases were unavailable; no count is shown.</p>}</section>
  </div><footer><UsersRound size={15}/><span>Updates every 30 seconds while open{updatedAt ? ` · last refreshed ${when(updatedAt)}` : ""}. Reports stay separate until a coordinator records a human decision.</span><BoardLink to="search-tasks">Field-search tasks</BoardLink><BoardLink to="missing">Missing-cat cases</BoardLink></footer></section>;
}
