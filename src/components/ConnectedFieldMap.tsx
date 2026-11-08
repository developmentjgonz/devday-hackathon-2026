import { useCallback, useEffect, useState } from "react";
import { FieldMap } from "./FieldMap";
import { mapRecords, type MapLayer, type MapRecord } from "@/lib/demo-data";

type Colony = { colony_key: string; broad_area: string; cat_count: number; needs_vet: number; fixed_count: number | null; tnr_pending: number; last_fed_at?: string };
type Cat = { cat_key: string; name: string; status: string; colonies: string[]; last_seen_at: string | null; medical: string };
const positions: Record<string, string> = { "COL-02": "col-lr", "COL-04": "col-fy", "COL-07": "col-cc", "COL-11": "col-rw", "COL-MB-DEMO": "col-mb", "COL-HL-DEMO": "col-hl", "COL-HM-DEMO": "col-hm" };
export function ConnectedFieldMap() {
  const [records, setRecords] = useState<MapRecord[]>([]);
  const [scope, setScope] = useState<"internal" | "sponsor" | "public">("public");
  const [access, setAccess] = useState<"internal" | "sponsor" | "public">("public");
  const [notice, setNotice] = useState("Loading stored colony census…");
  const [selected, setSelected] = useState<MapRecord | null>(null);
  const [layers, setLayers] = useState(new Set<MapLayer>(["colonies", "urgent", "sightings", "weather"]));
  const select = useCallback((record: MapRecord) => setSelected(record), []);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const sessionResponse = await fetch("/api/auth/session");
        const session = sessionResponse.ok ? await sessionResponse.json() : null;
        const response = await fetch(session ? "/api/private/census" : "/api/public/census");
        if (!response.ok) throw new Error();
        const census = await response.json() as { colonies: Colony[]; cats: Cat[] };
        const next = census.colonies.flatMap((colony) => {
          const anchor = mapRecords.find((record) => record.id === positions[colony.colony_key]);
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
        if (active) { const roleScope = session ? session.user.role === "sponsor" ? "sponsor" : "internal" : "public"; setAccess(roleScope); setScope(roleScope); setRecords([...next, ...cats, ...care, ...feeding]); setNotice(next.length ? "Stored census and observations, placed at deliberately fictional broad-area anchors. Public view uses broad activity zones; radii are search-planning heuristics, not measured probabilities." : "Import a fictional chat in Care workspace to populate this map."); }
      } catch { if (active) setNotice("Unable to load colony census. Refresh after the backend is available."); }
    })();
    return () => { active = false; };
  }, []);
  const tracker = scope !== "public" && access !== "public" ? mapRecords.filter((record) => record.id === "live-scout") : [];
  const hazards = access !== "public" ? mapRecords.filter((record) => record.layer === "hazards") : [];
  function toggle(layer: MapLayer) { setLayers((current) => { const next = new Set(current); if (next.has(layer)) next.delete(layer); else next.add(layer); return next; }); }
  return <><section className="page-heading"><div><p className="eyebrow">Stored census · fictional geography</p><h1>Field map</h1></div><label className="field-label">Viewing level<select value={scope} onChange={(event) => { setScope(event.target.value as typeof scope); setSelected(null); }}><option value="public">Public · broad areas</option>{access !== "public" && <option value="sponsor">Sponsor</option>}{access === "internal" && <option value="internal">Internal team</option>}</select></label></section><section className="panel"><p>{notice}</p><div className="shared-actions">{(["colonies", "sightings", "urgent", "feeding", "hazards", "weather"] as MapLayer[]).map((layer) => <label className="layer-control" key={layer}><input type="checkbox" checked={layers.has(layer)} onChange={() => toggle(layer)}/><span>{{ colonies: "Stored colonies", sightings: "Cat observations + Skipper tracker", urgent: "Care reviews", feeding: "Feeding visits", hazards: "Fictional hazards", weather: "Weather context", searches: "Search plans" }[layer]}</span></label>)}</div><FieldMap records={[...records, ...tracker, ...hazards]} activeLayers={layers} onSelect={select} selectedId={selected?.id} scope={scope}/><div className="map-record-list">{[...tracker, ...records].filter((record) => layers.has(record.layer)).map((record) => <button type="button" className={selected?.id === record.id ? "secondary-button active" : "secondary-button"} key={record.id} onClick={() => select(record)}>{scope === "public" ? record.area + " activity area" : record.title}</button>)}</div>{selected && <article className="shared-review"><h3>{scope === "public" ? selected.area + " activity area" : selected.title}</h3><p>{selected.detail}</p><small>{selected.observedAt} · fictional approximate position</small>{selected.id.startsWith("cat:") && <p><a href="#cats" onClick={() => sessionStorage.setItem("mews-selected-cat", selected.id.slice(4))}>Open cat profile</a></p>}</article>}</section></>;
}
