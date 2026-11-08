import { useState } from "react";
import { ArrowRight, Crosshair } from "lucide-react";
import { FieldMap, visibleRadiusMeters } from "./FieldMap";
import { privateJson } from "../lib/private-api";
import type { MapLayer, MapRecord } from "../lib/demo-data";

type Plan = { mode: string; summary: string; zones: MapRecord[]; matches: { catKey: string; name: string; score: number; lastSeenAt: string | null }[]; volunteerGuidance: string[]; clarification: string | null; photoAnalysis: string; radiusBasis: string };
const areas = ["Riverwalk Lot", "Little River Laundry", "Flagler Yard", "Canal Commons", "Miami Beach", "Hialeah", "Homestead", "Hollywood / Broward"];
export function StoredCatNavigator() {
  const [name, setName] = useState("Tux");
  const [area, setArea] = useState("Riverwalk Lot");
  const [lastSeen, setLastSeen] = useState("2026-11-04T18:00");
  const [description, setDescription] = useState("Black tuxedo cat with white chest, white paws, and a small white spot below the nose.");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [selected, setSelected] = useState<MapRecord | null>(null);
  const [notice, setNotice] = useState("Sign in as a team member to search the shared census. Use fictional cases only.");
  const [working, setWorking] = useState(false);
  const [layers, setLayers] = useState(new Set<MapLayer>(["searches", "weather"]));
  async function predict(event: React.FormEvent) {
    event.preventDefault(); setWorking(true); setPlan(null);
    try {
      const result = await privateJson("/api/lost-cat-search", { name, description, lastSeenArea: area, lastSeenAt: new Date(lastSeen).toISOString() }) as Plan;
      setPlan(result); setSelected(result.zones[0]); setNotice("Search plan ready · " + result.mode + " mode. A person must verify each proposed area.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Search unavailable"); }
    finally { setWorking(false); }
  }
  function draftTask() {
    if (!selected) return;
    sessionStorage.setItem("mews-search-draft", JSON.stringify({ title: "Observe " + selected.title + " for " + (name || "unidentified cat"), broadArea: area, catKey: plan?.matches[0]?.catKey ?? "", rationale: selected.detail }));
    location.hash = "search-tasks";
  }
  return <>
    <section className="page-heading"><div><p className="eyebrow">Shared census · private search planning</p><h1>Lost cat navigator</h1></div><Crosshair size={24}/></section>
    <div className="navigator-intro"><Crosshair size={20}/><p><b>Search suggestions are unverified.</b> Start with a last-seen report, compare stored cat records, and prepare safe observations. The map uses real Google geography with deliberately fictional search anchors.</p></div>
    <section className="navigator-layout">
      <form className="panel lost-form" onSubmit={(event) => void predict(event)}>
        <h2>Describe the missing cat</h2>
        <div className="two-fields"><label className="field-label">Name or nickname<input value={name} maxLength={100} onChange={(event) => setName(event.target.value)}/></label><label className="field-label">Last-seen demo area<select value={area} onChange={(event) => setArea(event.target.value)}>{areas.map((value) => <option key={value}>{value}</option>)}</select></label></div>
        <label className="field-label">Last seen, local date and time<input type="datetime-local" value={lastSeen} onChange={(event) => setLastSeen(event.target.value)} required/></label>
        <label className="field-label">Coat, markings and behavior<textarea value={description} maxLength={2000} onChange={(event) => setDescription(event.target.value)} required/></label>
        <p>For image evidence, use <a href="#photos">Private photo review</a>. This search compares text and stored records; it does not identify a cat from pixels.</p>
        <button className="primary-button" disabled={working}>{working ? "Preparing search…" : "Find likely search areas"}<ArrowRight size={16}/></button>
        <p role="status">{notice}</p>
      </form>
      <article className="panel prediction-card"><p className="eyebrow">Record comparison</p><h2>Evidence before identity</h2>{!plan ? <p>Submit a fictional report to compare candidates in the stored census.</p> : <><span className="badge violet">{plan.mode === "agent" ? "OpenAI agent" : plan.mode === "fallback" ? "Agent unavailable · fallback" : "Deterministic demo"}</span><p>{plan.summary}</p>{plan.matches.length ? plan.matches.map((cat) => <div className="shared-review" key={cat.catKey}><b>{cat.name}</b><p>{Math.round(cat.score * 100)}% text-match score · identity requires human confirmation</p><small>Latest source observation: {cat.lastSeenAt ? new Date(cat.lastSeenAt).toLocaleString() : "unknown"}</small></div>) : <p>No stored record has enough matching text. Keep this as an unconfirmed sighting.</p>}{plan.clarification && <p className="clarification">{plan.clarification}</p>}<p>{plan.photoAnalysis}</p></>}</article>
    </section>
    {plan && <section className="panel navigator-map"><h2>Areas to verify</h2><p>{plan.radiusBasis}</p><label className="layer-control"><input type="checkbox" checked={layers.has("weather")} onChange={(event) => setLayers(new Set<MapLayer>(event.target.checked ? ["searches", "weather"] : ["searches"]))}/>Weather planning cells</label><div className="navigator-map-body"><FieldMap records={plan.zones} activeLayers={layers} scope="internal" onSelect={setSelected} selectedId={selected?.id}/><aside>{plan.zones.map((zone) => <button className="candidate" key={zone.id} onClick={() => setSelected(zone)}><b>{zone.title}</b><span>{visibleRadiusMeters(zone, "internal")} m illustrative radius</span></button>)}{selected && <><h3>{selected.title}</h3><p>{selected.detail}</p><button className="primary-button" onClick={draftTask}>Prepare field-search task<ArrowRight size={16}/></button></>}</aside></div><div className="guidance">{plan.volunteerGuidance.map((item) => <p key={item}>{item}</p>)}</div></section>}
  </>;
}
