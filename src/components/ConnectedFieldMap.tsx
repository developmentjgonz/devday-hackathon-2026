import { useCallback, useEffect, useRef, useState } from "react";
import { FieldMap, visibleRadiusMeters } from "./FieldMap";
import { mapRecords, type MapLayer, type MapRecord } from "@/lib/demo-data";

type Colony = { colony_key: string; broad_area: string; cat_count: number; needs_vet: number; fixed_count: number | null; tnr_pending: number; last_fed_at?: string };
type Cat = { cat_key: string; name: string; status: string; colonies: string[]; last_seen_at: string | null; medical: string };
type MissingCase = { id: string; name: string; status: string; lastSeenArea: string; lastSeenAt: string; plan?: { zones: { id: string; label: string; position: { lat: number; lng: number } | null; radiusM: number; confidence: number; safeGuide: string }[] } | null };
const positions: Record<string, string> = { "COL-02": "col-lr", "COL-04": "col-fy", "COL-07": "col-cc", "COL-11": "col-rw", "COL-MB-DEMO": "col-mb", "COL-HL-DEMO": "col-hl", "COL-HM-DEMO": "col-hm" };
function colonyAnchor(colony:Colony) {
  const primary=mapRecords.find(record=>record.id===positions[colony.colony_key]);
  if(primary)return primary;
  const area=mapRecords.find(record=>record.layer==='colonies'&&record.area===colony.broad_area);
  const base=area??(colony.broad_area==='Hollywood / Broward'?{...mapRecords.find(record=>record.id==='col-rw')!,area:colony.broad_area,position:{lat:26.01,lng:-80.16}}:null);
  if(!base)return null;
  const hash=[...colony.colony_key].reduce((value,char)=>Math.imul(value,31)+char.charCodeAt(0)|0,0)>>>0;
  return {...base,title:colony.colony_key+' · '+colony.broad_area,position:{lat:base.position.lat+((hash%7)-3)*.003,lng:base.position.lng+((Math.floor(hash/7)%7)-3)*.003}};
}
export function ConnectedFieldMap() {
  const [records, setRecords] = useState<MapRecord[]>([]);
  const [revision, setRevision] = useState(0);
  const [scope, setScope] = useState<"internal" | "sponsor" | "public">("public");
  const [access, setAccess] = useState<"internal" | "sponsor" | "public">("public");
  const [notice, setNotice] = useState("Loading stored colony census…");
  const [selected, setSelected] = useState<MapRecord | null>(null);
  const requestId=useRef(0);
  const identity=useRef<string|null>(null);
  const [layers, setLayers] = useState(new Set<MapLayer>(["colonies", "urgent", "sightings", "weather", "searches"]));
  const select = useCallback((record: MapRecord) => setSelected(record), []);
  useEffect(() => {
    const timer=setInterval(()=>setRevision(value=>value+1),30000);
    const refresh=()=>setRevision(value=>value+1);
    const authChanged=()=>{requestId.current+=1;identity.current=null;setRecords([]);setSelected(null);setAccess('public');setScope('public');refresh();};
    addEventListener('mews-data-changed',refresh);addEventListener('mews-auth-changed',authChanged);
    return()=>{clearInterval(timer);removeEventListener('mews-data-changed',refresh);removeEventListener('mews-auth-changed',authChanged);};
  },[]);
  useEffect(() => {
    let active = true;
    const currentRequest=++requestId.current;
    const current=()=>active&&requestId.current===currentRequest;
    void (async () => {
      try {
        const sessionResponse = await fetch("/api/auth/session");
        if(!sessionResponse.ok&&sessionResponse.status!==401)throw new Error('Session unavailable');
        const session = sessionResponse.ok ? await sessionResponse.json() : null;
        const nextIdentity=session?`${session.user.id}:${session.user.email}:${session.user.role}`:'public';
        const roleScope=session?(session.user.role==='sponsor'?'sponsor':'internal'):'public';
        if(!current())return;
        setAccess(roleScope);
        if(identity.current!==nextIdentity){identity.current=nextIdentity;setRecords([]);setSelected(null);setScope(roleScope);}
        const missingRequest = session && session.user.role !== "sponsor" ? fetch("/api/private/missing-cases").then(async (response) => response.ok ? (await response.json()).cases as MissingCase[] : []).catch(() => [] as MissingCase[]) : Promise.resolve([] as MissingCase[]);
        const response = await fetch(session ? "/api/private/census" : "/api/public/census");
        if (!response.ok) throw new Error();
        const census = await response.json() as { colonies: Colony[]; cats: Cat[] };
        const next = census.colonies.flatMap((colony) => {
          const anchor = colonyAnchor(colony);
          if (!anchor) return [];
          return [{ ...anchor, id: colony.colony_key, title: anchor.title, detail: colony.cat_count + " identified cats · " + (colony.fixed_count == null ? "fixed status unknown" : colony.fixed_count + " documented fixed") + " · " + colony.tnr_pending + " TNR pending · " + colony.needs_vet + " care reviews", status: colony.needs_vet ? "Care review" : "Monitoring", observedAt: "Stored census", layer: "colonies" as const }];
        });
        const cats = census.cats.filter((cat) => cat.status !== "merged" && cat.cat_key !== "CAT-SKIPPER").flatMap((cat, index) => {
          const home = next.find((record) => cat.colonies.includes(record.id)); if (!home) return [];
          const age = cat.last_seen_at ? Math.max(0, (Date.now() - Date.parse(cat.last_seen_at)) / 3_600_000) : 72;
          return [{ ...home, id: "cat:" + cat.cat_key, title: cat.name, layer: "sightings" as const, position: { lat: home.position.lat + (index % 3 - 1) * .0012, lng: home.position.lng - .0012 }, detail: "Latest source observation · identity and location require field verification.", locationSignal: "last-seen" as const, internalRadiusMeters: Math.min(1800, Math.round(100 + Math.sqrt(age) * 65)), confidence: .6, observedAt: cat.last_seen_at ?? "Unknown observation time" }];
        });
        const care = next.filter((record) => record.status === "Care review").map((record) => ({ ...record, id: "care:" + record.id, title: record.title + " care review", layer: "urgent" as const }));
        const feeding = census.colonies.filter((colony) => colony.last_fed_at).flatMap((colony) => { const home = next.find((record) => record.id === colony.colony_key); return home ? [{ ...home, id: "feed:" + colony.colony_key, layer: "feeding" as const, title: home.title + " last feed", detail: "Last confirmed feed " + new Date(colony.last_fed_at!).toLocaleString(), observedAt: colony.last_fed_at! }] : []; });
        const missing: MapRecord[] = (await missingRequest).filter((item) => item.status === "active").flatMap((item) => (item.plan?.zones ?? []).filter((zone) => zone.position).map((zone) => ({ id: "missing:" + item.id + ":" + zone.id, title: item.name + " · " + zone.label, area: item.lastSeenArea, position: zone.position!, layer: "searches", status: "Saved search suggestion", detail: "Unverified heuristic priority " + Math.round(zone.confidence * 100) + "% · " + zone.safeGuide, locationSignal: "last-seen", internalRadiusMeters: zone.radiusM, confidence: zone.confidence, observedAt: "Case last seen " + new Date(item.lastSeenAt).toLocaleString() })));
        if (current()) { const updated=[...next,...cats,...care,...feeding,...missing];const unplaced=census.cats.filter(cat=>cat.status!=="merged"&&cat.cat_key!=="CAT-SKIPPER").length-cats.length;setRecords(updated);setSelected(prior=>prior?.id.startsWith('missing:')?updated.find(record=>record.id===prior.id)??null:prior?updated.find(record=>record.id===prior.id)??prior:null); const focus=sessionStorage.getItem('mews-map-focus');if(focus){const match=next.find(record=>record.id===focus);if(match){setSelected(match);sessionStorage.removeItem('mews-map-focus');}} setNotice(next.length ? "Stored census, observations and saved search plans refresh every 30 seconds. Anchors are fictional; public view uses broad activity zones. Radii are planning heuristics, not measured probabilities."+(unplaced>0?` ${unplaced} cat record(s) await a colony assignment and are not placed on the map.`:"") : "Import a fictional chat in Care workspace to populate this map."); }
      } catch { if (current()) {identity.current=null;setRecords([]);setSelected(null);setAccess('public');setScope('public');setNotice("Unable to load colony census. Refresh after the backend is available.");} }
    })();
    return () => { active = false; };
  }, [revision]);
  const tracker = scope !== "public" && access !== "public" ? mapRecords.filter((record) => record.id === "live-scout") : [];
  const hazards = access !== "public" ? mapRecords.filter((record) => record.layer === "hazards") : [];
  const visibleRecords = scope === "internal" ? records : records.filter((record) => !record.id.startsWith("missing:"));
  function toggle(layer: MapLayer) { if(layers.has(layer)&&selected?.layer===layer)setSelected(null);setLayers((current) => { const next = new Set(current); if (next.has(layer)) next.delete(layer); else next.add(layer); return next; }); }
  return <><section className="page-heading"><div><p className="eyebrow">Stored census · fictional geography</p><h1>Field map</h1></div><label className="field-label">Viewing level<select value={scope} onChange={(event) => { setScope(event.target.value as typeof scope); setSelected(null); }}><option value="public">Public · broad areas</option>{access !== "public" && <option value="sponsor">Sponsor</option>}{access === "internal" && <option value="internal">Internal team</option>}</select></label></section><section className="panel"><p>{notice}</p><div className="shared-actions map-layer-controls">{(["colonies", "sightings", "urgent", "feeding", "hazards", "weather", "searches"] as MapLayer[]).map((layer) => <label className="layer-control" key={layer}><input type="checkbox" checked={layers.has(layer)} onChange={() => toggle(layer)}/><span>{{ colonies: "Stored colonies", sightings: "Cat observations + Skipper tracker", urgent: "Care reviews", feeding: "Feeding visits", hazards: "Fictional hazards", weather: "Weather context", searches: "Active missing-cat search plans" }[layer]}</span></label>)}</div><FieldMap records={[...visibleRecords, ...tracker, ...hazards]} activeLayers={layers} onSelect={select} selectedId={selected?.id} scope={scope}/><div className="map-record-list">{[...tracker, ...visibleRecords].filter((record) => layers.has(record.layer)).map((record) => <button type="button" className={selected?.id === record.id ? "secondary-button active" : "secondary-button"} key={record.id} onClick={() => select(record)}>{scope === "public" ? record.area + " activity area" : record.title}</button>)}</div>{selected && <article className="shared-review"><h3>{scope === "public" ? selected.area + " activity area" : selected.title}</h3><p>{selected.detail}</p><p>Displayed radius: <b>{new Intl.NumberFormat().format(Math.round(visibleRadiusMeters(selected,scope)))} m</b> · {scope} view. This is an illustrative uncertainty area.</p><small>{selected.observedAt} · fictional approximate position</small>{scope === "internal" && selected.id.startsWith("cat:") && <p><a href="#cats" onClick={() => sessionStorage.setItem("mews-selected-cat", selected.id.slice(4))}>Open cat profile</a></p>}</article>}</section></>;
}
