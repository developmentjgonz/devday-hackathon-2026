import { useEffect, useMemo, useRef, useState } from "react";
import type { MapLayer, MapRecord } from "@/lib/demo-data";

type FieldMapProps = {
  records: MapRecord[];
  activeLayers: Set<MapLayer>;
  onSelect: (record: MapRecord) => void;
  selectedId?: string;
  scope: "internal" | "sponsor" | "public";
};

type GoogleMapInstance = {
  setCenter: (position: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
};

declare global {
  interface Window {
    google?: { maps?: { Map: new (element: Element, options: object) => GoogleMapInstance; Marker: new (options: object) => { setMap: (map: GoogleMapInstance | null) => void; addListener: (name: string, handler: () => void) => void } } };
  }
}

const colors: Record<MapLayer, string> = {
  colonies: "#2c7a5e",
  sightings: "#277da1",
  urgent: "#c7533f",
  hazards: "#a66a16",
  searches: "#7755ad",
  feeding: "#23785d",
};

export function visibleRadiusMeters(record: MapRecord, scope: "internal" | "sponsor" | "public") {
  // Internal and sponsor users can see the same operational precision, but
  // only internal members receive feeder/contact information elsewhere in the
  // product. Public viewers are always rounded to at least 500 m.
  if (scope === "public") return Math.max(500, record.internalRadiusMeters * 2.4);
  if (scope === "sponsor") return Math.max(45, record.internalRadiusMeters);
  return record.internalRadiusMeters;
}

function fallbackRadiusPixels(record: MapRecord, scope: "internal" | "sponsor" | "public") {
  const meters = visibleRadiusMeters(record, scope);
  return Math.min(145, Math.max(scope === "public" ? 38 : 13, meters / (scope === "public" ? 13 : 9)));
}

function loadGoogleMaps(key: string) {
  if (window.google?.maps) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>("script[data-google-maps]");
  if (existing) return new Promise<void>((resolve, reject) => {
    existing.addEventListener("load", () => resolve(), { once: true });
    existing.addEventListener("error", () => reject(new Error("Map script could not load")), { once: true });
  });
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.dataset.googleMaps = "true";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Map script could not load"));
    document.head.append(script);
  });
}

export function FieldMap({ records, activeLayers, onSelect, selectedId, scope }: FieldMapProps) {
  const mapHost = useRef<HTMLDivElement>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [mapsFailed, setMapsFailed] = useState(false);
  const [trackerTick, setTrackerTick] = useState(0);
  const visibleRecords = useMemo(() => records.filter((record) => activeLayers.has(record.layer)), [records, activeLayers]);
  const renderedRecords = useMemo(() => visibleRecords.map((record) => record.id !== "live-scout" ? record : {
    ...record,
    position: {
      lat: record.position.lat + Math.sin(trackerTick / 2) * .0022,
      lng: record.position.lng + Math.cos(trackerTick / 2) * .0028,
    },
    observedAt: `Live demo ping · ${trackerTick * 6 || 2} sec ago`,
  }), [trackerTick, visibleRecords]);

  useEffect(() => {
    const interval = window.setInterval(() => setTrackerTick((tick) => tick + 1), 6000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/config")
      .then((response) => response.ok && response.headers.get("content-type")?.includes("application/json") ? response.json() : {})
      .then((config: { googleMapsBrowserKey?: string | null }) => {
        if (!config.googleMapsBrowserKey || cancelled) return;
        return loadGoogleMaps(config.googleMapsBrowserKey).then(() => {
          if (!cancelled) setGoogleReady(true);
        });
      })
      .catch(() => { if (!cancelled) setMapsFailed(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!googleReady || !mapHost.current || !window.google?.maps) return;
    const map = new window.google.maps.Map(mapHost.current, {
      center: { lat: 25.83, lng: -80.23 },
      zoom: 10,
      minZoom: 8,
      maxZoom: 18,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
      restriction: { latLngBounds: { north: 26.45, south: 25.1, east: -79.85, west: -80.9 }, strictBounds: false },
      styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
    });
    renderedRecords.forEach((record) => {
      const Maps = window.google!.maps as any;
      new Maps.Circle({
        map,
        center: record.position,
        radius: visibleRadiusMeters(record, scope),
        fillColor: colors[record.layer],
        fillOpacity: scope === "public" ? .18 : .12,
        strokeColor: colors[record.layer],
        strokeOpacity: .72,
        strokeWeight: 1.25,
        clickable: false,
      });
      const marker = new window.google!.maps!.Marker({
        map,
        position: record.position,
        title: `${record.title} · synthetic demo`,
        icon: { path: 0, fillColor: colors[record.layer], fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2, scale: record.layer === "urgent" ? 9 : 7 },
      });
      marker.addListener("click", () => onSelect(record));
    });
  }, [googleReady, onSelect, scope, renderedRecords]);

  return <div className="field-map" aria-label="Interactive South Florida field map">
    <div ref={mapHost} className={googleReady ? "google-map active" : "google-map"} aria-hidden={!googleReady} />
    {!googleReady && <div className="map-fallback" role="img" aria-label="Synthetic South Florida map preview with approximate demo markers">
      <div className="fallback-water water-east" /><div className="fallback-water water-west" />
      <span className="fallback-label broward">BROWARD</span><span className="fallback-label miami">MIAMI-DADE</span><span className="fallback-label keys">SOUTH DADE</span>
      {renderedRecords.map((record) => <div key={record.id} className={record.id === "live-scout" ? "fallback-record tracker-ping" : "fallback-record"} style={{ left: `${((record.position.lng + 80.9) / 1.05) * 100}%`, top: `${((26.45 - record.position.lat) / 1.35) * 100}%` }}>
        <span className={`probability-ring ${record.layer}`} style={{ width: fallbackRadiusPixels(record, scope) * 2, height: fallbackRadiusPixels(record, scope) * 2 }} />
        <button className={`map-pin ${record.layer} ${selectedId === record.id ? "selected" : ""}`} aria-label={`${record.title}, ${record.area}, synthetic demo`} onClick={() => onSelect(record)} />
      </div>)}
    </div>}
    <div className="map-provider-status">{googleReady ? `Google Maps · ${scope} confidence radii · ${renderedRecords.some((record) => record.id === "live-scout") ? "demo tracker active" : "synthetic demo records"}` : mapsFailed ? "Map unavailable · showing local synthetic preview" : "Synthetic preview · add GOOGLE_MAPS_BROWSER_KEY for Google Maps"}</div>
  </div>;
}
