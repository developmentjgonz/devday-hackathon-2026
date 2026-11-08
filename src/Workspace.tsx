import { useEffect, useState } from "react";
import { Bell, CalendarDays, Compass, Crosshair, Database, FlaskConical, Image, Menu, MessageSquare, PawPrint, Settings2, Upload, X } from "lucide-react";
import { StoredCatNavigator } from "./components/StoredCatNavigator";
import { ConnectedFieldMap } from "./components/ConnectedFieldMap";
import { SharedIntake } from "./components/SharedIntake";
import { DurableOutbox } from "./components/DurableOutbox";
import { AgentEvaluation } from "./components/AgentEvaluation";
import { CommunitySignals } from "./components/CommunitySignals";
import { LiveShift } from "./components/LiveShift";
import { FieldSchedule } from "./components/FieldSchedule";
import { FieldSearchTasks } from "./components/FieldSearchTasks";
import { OutcomeReports } from "./components/OutcomeReports";
import { PhoneReport } from "./components/PhoneReport";
import { PhotoMatchReview } from "./components/PhotoMatchReview";
import { CatDirectory } from "./components/CatDirectory";
import { deliverFieldOutbox } from "./lib/field-outbox";

type View = "overview" | "map" | "lost" | "imports" | "photos" | "evaluation" | "community" | "schedule" | "search-tasks" | "outcomes" | "report" | "matches" | "cats";
const views = [
  ["overview", "Care workspace", Database],
  ["report", "New field report", PawPrint],
  ["imports", "Chat imports & outbox", Upload],
  ["map", "Field map", Compass],
  ["cats", "Cat profiles & visits", PawPrint],
  ["matches", "Photo match review", Image],
  ["lost", "Lost cat navigator", Crosshair],
  ["photos", "Private photo review", Image],
  ["schedule", "Feeding schedule", CalendarDays],
  ["search-tasks", "Field-search tasks", Crosshair],
  ["outcomes", "Care outcomes & reports", Database],
  ["evaluation", "Agent evaluation", FlaskConical],
  ["community", "Community signals", MessageSquare],
] as const;

export function Workspace({ photos }: { photos?: React.ReactNode }) {
  const [view, setView] = useState<View>(() => views.some(([id]) => id === location.hash.slice(1)) ? location.hash.slice(1) as View : "overview");
  const [menu, setMenu] = useState(false);
  const [settings, setSettings] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
  const [alerts, setAlerts] = useState<{ id: string; explanation: string; review_kind: string }[]>([]);
  const [compact, setCompact] = useState(() => localStorage.getItem("mews-compact") === "true");
  const [contrast, setContrast] = useState(() => localStorage.getItem("mews-contrast") === "true");
  const [largeText, setLargeText] = useState(() => localStorage.getItem("mews-large-text") === "true");
  const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem("mews-reduce-motion") === "true");
  const [read, setRead] = useState<string[]>([]);
  useEffect(() => { const retry = () => void deliverFieldOutbox(); addEventListener("online", retry); addEventListener("mews-data-changed", retry); retry(); return () => { removeEventListener("online", retry); removeEventListener("mews-data-changed", retry); }; }, []);
  useEffect(() => {
    document.documentElement.dataset.demoDensity = compact ? "compact" : "comfortable";
    document.documentElement.dataset.demoTheme = contrast ? "contrast" : "meadow";
    localStorage.setItem("mews-compact", String(compact)); localStorage.setItem("mews-contrast", String(contrast));
    document.documentElement.dataset.largeText = String(largeText); document.documentElement.dataset.reduceMotion = String(reduceMotion);
    localStorage.setItem("mews-large-text", String(largeText)); localStorage.setItem("mews-reduce-motion", String(reduceMotion));
  }, [compact, contrast, largeText, reduceMotion]);
  useEffect(() => {
    const handler = () => { const hash = location.hash.slice(1); if (views.some(([id]) => id === hash)) setView(hash as View); };
    addEventListener("hashchange", handler); return () => removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    let cancelled = false;
    async function sync() {
      try {
        const response = await fetch("/api/auth/session");
        if (!response.ok) { if (!cancelled) { setUser(null); setAlerts([]); } return; }
        const data = await response.json();
        if (!cancelled) setUser(data.user);
        if (data.user.role === "sponsor") { if (!cancelled) setAlerts([]); return; }
        const incoming = await fetch("/api/private/intake");
        if (incoming.ok) {
          const data = await incoming.json();
          const reviews = (data.reviews ?? []).filter((review: { status: string }) => review.status === "open");
          const feedingResponse = await fetch("/api/private/feeding-assignments");
          if (feedingResponse.ok) {
            const feeding = await feedingResponse.json();
            reviews.push(...(feeding.assignments ?? []).filter((item: { overdue: boolean }) => item.overdue).map((item: { id: string; colony_key: string; due_at: string }) => ({ id: "feeding:" + item.id, review_kind: "missed_feeding", explanation: item.colony_key + " feeding overdue since " + new Date(item.due_at).toLocaleString() })));
          }
          if (!cancelled) setAlerts(reviews);
        }
      } catch { /* Connection status is shown by each workspace action. */ }
    }
    void sync();
    const timer = setInterval(() => void sync(), 10000);
    addEventListener("mews-data-changed", sync);
    return () => { cancelled = true; clearInterval(timer); removeEventListener("mews-data-changed", sync); };
  }, []);
  function go(next: View) { setView(next); setMenu(false); location.hash = next; window.scrollTo({ top: 0 }); }
  const unread = alerts.filter((item) => !read.includes(item.id));
  return <div className="app-shell">
    <aside className={menu ? "sidebar mobile-open" : "sidebar"}>
      <a className="brand" href="#overview" onClick={() => go("overview")}><span className="brand-mark"><PawPrint size={23}/></span><span><b>Mangrove</b><em>Mews</em></span></a>
      <nav>{views.map(([id, label, Icon]) => <button key={id} className={view === id ? "active" : ""} onClick={() => go(id)}><Icon size={18}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="privacy-note"><p className="eyebrow">Synthetic field workspace</p><p>Fictional cats and messages across Miami-Dade and Broward. Shared records are stored by the backend.</p></div><div className="profile"><i>{user?.role?.slice(0, 2).toUpperCase() ?? "MM"}</i><span><b>{user?.role ?? "Public preview"}</b><small>{user ? "Server session" : "Sign in for team tools"}</small></span></div></div>
    </aside>
    <main><header className="topbar">
      <button className="mobile-menu icon-button" onClick={() => setMenu(!menu)} aria-label="Open navigation"><Menu size={20}/></button>
      <div className="region"><span/><b>South Florida</b><small>Care workspace</small></div>
      <div className="workspace-tools"><button className="icon-button" aria-label="Notifications" onClick={() => { setNotifications(!notifications); setSettings(false); }}><Bell size={18}/>{unread.length > 0 && <span className="workspace-count">{unread.length}</span>}</button><button className="icon-button" aria-label="Appearance settings" onClick={() => { setSettings(!settings); setNotifications(false); }}><Settings2 size={18}/></button><button className="secondary-button workspace-profile" onClick={() => go("overview")}>{user?.email ?? "Team sign in"}</button></div>
    </header>
    {settings && <section className="workspace-popover"><header><b>Appearance preferences</b><button className="icon-button" aria-label="Close settings" onClick={() => setSettings(false)}><X size={16}/></button></header><label><span>Compact layout</span><input type="checkbox" checked={compact} onChange={() => setCompact(!compact)}/></label><label><span>High contrast</span><input type="checkbox" checked={contrast} onChange={() => setContrast(!contrast)}/></label><label><span>Larger text and controls</span><input type="checkbox" checked={largeText} onChange={() => setLargeText(!largeText)}/></label><label><span>Reduce interface motion</span><input type="checkbox" checked={reduceMotion} onChange={() => setReduceMotion(!reduceMotion)}/></label><p>Saved on this device. Your team role is set by the server.</p></section>}
    {notifications && <section className="workspace-popover"><header><b>Review notifications</b><button className="icon-button" aria-label="Close notifications" onClick={() => setNotifications(false)}><X size={16}/></button></header><p>{user ? unread.length + " unread of " + alerts.length + " open reviews" : "Sign in to see team notifications."}</p>{alerts.slice(0, 20).map((item) => <button key={item.id} className="workspace-alert" onClick={() => { setRead((current) => [...current, item.id]); go(item.id.startsWith("feeding:") ? "schedule" : "overview"); setNotifications(false); }}><b>{item.review_kind.replaceAll("_", " ")}</b><span>{item.explanation}</span></button>)}{alerts.length > 0 && <button className="secondary-button" onClick={() => setRead(alerts.map((item) => item.id))}>Mark all read</button>}</section>}
    <div className="content">
      {view === "overview" && <><section className="page-heading"><div><p className="eyebrow">Fictional data · persistent care records</p><h1>Care, before it gets missed.</h1></div></section><SharedIntake/></>}
      {view === "imports" && <><section className="page-heading"><div><p className="eyebrow">Intentional exports and messages</p><h1>Import a field shift</h1></div></section><LiveShift/><DurableOutbox/></>}
      {view === "map" && <ConnectedFieldMap/>}
      {view === "lost" && <StoredCatNavigator/>}
      {view === "photos" && (photos ?? <section className="panel"><h1>Private photo review</h1><p>Loading the photo workspace.</p></section>)}
      {view === "evaluation" && <AgentEvaluation/>}
      {view === "community" && <CommunitySignals/>}
      {view === "schedule" && <FieldSchedule/>}
      {view === "search-tasks" && <FieldSearchTasks/>}
      {view === "outcomes" && <OutcomeReports/>}
      {view === "report" && <PhoneReport/>}
      {view === "matches" && <PhotoMatchReview/>}
      {view === "cats" && <CatDirectory/>}
    </div></main>
  </div>;
}
