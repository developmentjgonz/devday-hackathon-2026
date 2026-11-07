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

type WeatherSnapshot = {
  area: string;
  temperature: number | null;
  precipitationNextSixHours: number | null;
  windSpeed: number | null;
  weatherCode: number | null;
  updatedAt: string;
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
  weather: "#287ba2",
};

const weatherPoints = [
  { area: "Miami-Dade weather cell", lat: 25.78, lng: -80.22 },
  { area: "Broward weather cell", lat: 26.12, lng: -80.16 },
];

function weatherDetail(snapshot: WeatherSnapshot) {
  const temperature = snapshot.temperature == null ? "temperature unavailable" : `${Math.round(snapshot.temperature)}°C`;
  const rain = snapshot.precipitationNextSixHours == null ? "rain outlook unavailable" : `${snapshot.precipitationNextSixHours.toFixed(1)} mm forecast / 6 h`;
  const wind = snapshot.windSpeed == null ? "wind unavailable" : `${Math.round(snapshot.windSpeed)} km/h wind`;
  return `Live planning context · ${temperature} · ${rain} · ${wind}`;
}

function weatherStatus(snapshot: WeatherSnapshot) {
  if ((snapshot.precipitationNextSixHours ?? 0) >= 8) return "Flood / cover review";
  if ((snapshot.precipitationNextSixHours ?? 0) >= 2) return "Rain-cover review";
  if ((snapshot.temperature ?? 0) >= 32) return "Heat-shade review";
  return "Weather planning";
}

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
  const mapInstance = useRef<GoogleMapInstance | null>(null);
  const overlays = useRef<{ setMap: (map: GoogleMapInstance | null) => void }[]>([]);
  const trackerFocused = useRef(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [mapsFailed, setMapsFailed] = useState(false);
  const [trackerTick, setTrackerTick] = useState(0);
  const [weather, setWeather] = useState<WeatherSnapshot[]>([]);
  const weatherRecords = useMemo<MapRecord[]>(() => weather.map((snapshot, index) => ({
    id: `weather-${index}`,
    title: snapshot.area,
    area: snapshot.area,
    position: { lat: weatherPoints[index].lat, lng: weatherPoints[index].lng },
    layer: "weather",
    status: weatherStatus(snapshot),
    detail: weatherDetail(snapshot),
    locationSignal: "unconfirmed-report",
    confidence: .88,
    internalRadiusMeters: 16_000,
    observedAt: `Live source updated ${snapshot.updatedAt}`,
  })), [weather]);
  const visibleRecords = useMemo(() => [...records, ...weatherRecords].filter((record) => activeLayers.has(record.layer)), [records, weatherRecords, activeLayers]);
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
    const tracker = records.find((record) => record.id === "live-scout");
    if (tracker && !trackerFocused.current) {
      trackerFocused.current = true;
      onSelect(tracker);
    }
  }, [onSelect, records]);

  useEffect(() => {
    let cancelled = false;
    async function loadWeather() {
      try {
        const results = await Promise.all(weatherPoints.map(async (point) => {
          const params = new URLSearchParams({ latitude: String(point.lat), longitude: String(point.lng), current: "temperature_2m,wind_speed_10m,weather_code", hourly: "precipitation", forecast_days: "1", timezone: "America/New_York" });
          const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
          if (!response.ok) throw new Error("Weather source unavailable");
          const data = await response.json() as { current?: { temperature_2m?: number; wind_speed_10m?: number; weather_code?: number; time?: string }; hourly?: { time?: string[]; precipitation?: number[] } };
          const now = data.current?.time ?? new Date().toISOString();
          const start = Math.max(0, data.hourly?.time?.findIndex((time) => time >= now) ?? 0);
          const precipitation = (data.hourly?.precipitation ?? []).slice(start, start + 6).reduce((sum, value) => sum + Number(value || 0), 0);
          return { area: point.area, temperature: data.current?.temperature_2m ?? null, precipitationNextSixHours: precipitation, windSpeed: data.current?.wind_speed_10m ?? null, weatherCode: data.current?.weather_code ?? null, updatedAt: data.current?.time ?? "just now" };
        }));
        if (!cancelled) setWeather(results);
      } catch {
        if (!cancelled) setWeather([]);
      }
    }
    void loadWeather();
    const interval = window.setInterval(() => void loadWeather(), 15 * 60 * 1000);
    return () => { cancelled = true; window.clearInterval(interval); };
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
    if (!googleReady || !mapHost.current || !window.google?.maps || mapInstance.current) return;
    const Maps = window.google.maps as any;
    mapInstance.current = new Maps.Map(mapHost.current, {
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
    return () => {
      overlays.current.forEach((overlay) => overlay.setMap(null));
      overlays.current = [];
      mapInstance.current = null;
    };
  }, [googleReady]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !window.google?.maps) return;
    overlays.current.forEach((overlay) => overlay.setMap(null));
    const nextOverlays: { setMap: (map: GoogleMapInstance | null) => void }[] = [];
    renderedRecords.forEach((record) => {
      const Maps = window.google!.maps as any;
      const circle = new Maps.Circle({
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
      const marker = new Maps.Marker({
        map,
        position: record.position,
        title: record.id === "live-scout" ? "LIVE demo tracker · Skipper" : record.layer === "weather" ? `${record.title} · live weather planning` : `${record.title} · synthetic demo`,
        label: record.id === "live-scout" ? { text: "LIVE", color: "#123f54", fontWeight: "700", fontSize: "9px" } : undefined,
        icon: { path: 0, fillColor: record.id === "live-scout" ? "#43b8df" : colors[record.layer], fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2, scale: record.id === "live-scout" ? 14 : record.layer === "urgent" ? 9 : record.layer === "weather" ? 11 : 7 },
      });
      marker.addListener("click", () => onSelect(record));
      nextOverlays.push(circle, marker);
    });
    overlays.current = nextOverlays;
  }, [onSelect, scope, renderedRecords]);

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
    <div className="map-provider-status">{googleReady ? `Google Maps · ${scope} confidence radii · ${renderedRecords.some((record) => record.id === "live-scout") ? "LIVE Skipper tracker" : "synthetic demo records"}${weather.length ? " · weather cells refreshed" : ""}` : mapsFailed ? "Map unavailable · showing local synthetic preview" : "Synthetic preview · add GOOGLE_MAPS_BROWSER_KEY for Google Maps"}</div>
  </div>;
}
