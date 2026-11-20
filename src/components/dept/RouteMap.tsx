import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polygon, Polyline, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { precipZonesAt } from "../../lib/weather-precip";
import {
  AIRPORTS,
  buildRegionalTraffic,
  flightPoseAt,
  routeProgressPoints,
  type RegionalFlight,
} from "../../lib/weather-traffic";
import type { ScenarioClock } from "../../lib/weather-time";
import type { SimulationState } from "../../lib/simulation/types";

const NEUTRAL_TILES =
  "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png";
const LABEL_TILES = "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png";

function airportIcon(code: string, groundHint?: string) {
  return L.divIcon({
    className: "wx-dot",
    iconSize: groundHint ? [72, 40] : [32, 22],
    iconAnchor: [16, 11],
    html: `<div class="wx-dot__wrap"><span class="wx-dot__code">${code}</span>${
      groundHint ? `<span class="wx-dot__hint">${groundHint}</span>` : ""
    }</div>`,
  });
}

function trafficIcon(flight: string, degrees: number, selected: boolean, showLabel: boolean) {
  const size = selected ? 42 : 26;
  const fill = selected ? "#16356f" : "#7f93af";
  return L.divIcon({
    className: "wx-plane",
    iconSize: [size, size + (showLabel ? 18 : 0)],
    iconAnchor: [size / 2, size / 2],
    html: `<button type="button" class="wx-plane__btn ${selected ? "is-selected" : ""}" style="--heading:${degrees}deg">
      <svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><path fill="${fill}" d="M32 3l5 20 18 6-2 5-16-4-2 16 8 6v4l-11-3-11 3v-4l8-6-2-16-16 4-2-5 18-6z"/></svg>
      ${showLabel ? `<span class="wx-plane__label">${flight}</span>` : ""}
    </button>`,
  });
}

function clusterIcon(count: number) {
  return L.divIcon({
    className: "wx-cluster",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<span class="wx-cluster__count">${count}</span>`,
  });
}

function MapCamera({
  frameToken,
  live,
  selected,
}: {
  frameToken: number;
  live: boolean;
  selected: RegionalFlight | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (live) {
      map.fitBounds(
        L.latLngBounds([
          [33.5, -112],
          [42, -87],
        ]),
        { paddingTopLeft: [24, 72], paddingBottomRight: [24, 88], maxZoom: 6.5 },
      );
      return;
    }
    if (!selected) {
      map.setView([39.1, -98.4], 5.25);
      return;
    }
    const points = [selected.origin, ...(selected.waypoints ?? []), selected.destination];
    map.fitBounds(points, {
      paddingTopLeft: [32, 72],
      paddingBottomRight: [32, 96],
      maxZoom: 6.75,
    });
  }, [frameToken, live, selected, map]);
  return null;
}

function LiveTools({ sourceLine }: { sourceLine: string | null }) {
  const map = useMap();
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const onError = () => setNote("Location unavailable");
    map.on("locationerror", onError);
    return () => {
      map.off("locationerror", onError);
    };
  }, [map]);

  return (
    <div className="wx-live-tools">
      {sourceLine ? <span className="wx-live-source">{sourceLine}</span> : null}
      <button type="button" className="wx-live-secondary" onClick={() => map.locate({ setView: true, maxZoom: 8 })}>
        My Location
      </button>
      {note ? <span>{note}</span> : null}
    </div>
  );
}

function useClusteredFlights(flights: { id: string; position: [number, number]; selected: boolean }[], zoom: number) {
  return useMemo(() => {
    if (zoom >= 6.25) {
      return flights.map((flight) => ({ kind: "single" as const, ...flight }));
    }
    const buckets = new Map<string, typeof flights>();
    for (const flight of flights) {
      if (flight.selected) {
        buckets.set(`solo-${flight.id}`, [flight]);
        continue;
      }
      const key = `${Math.round(flight.position[0] * 4) / 4}:${Math.round(flight.position[1] * 4) / 4}`;
      const group = buckets.get(key) ?? [];
      group.push(flight);
      buckets.set(key, group);
    }
    return [...buckets.values()].map((group) => {
      if (group.length === 1) return { kind: "single" as const, ...group[0] };
      const lat = group.reduce((sum, item) => sum + item.position[0], 0) / group.length;
      const lng = group.reduce((sum, item) => sum + item.position[1], 0) / group.length;
      return { kind: "cluster" as const, id: group.map((item) => item.id).join(","), position: [lat, lng] as [number, number], count: group.length };
    });
  }, [flights, zoom]);
}

function MapZoomReporter({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const notify = () => onZoom(map.getZoom());
    notify();
    map.on("zoomend", notify);
    return () => {
      map.off("zoomend", notify);
    };
  }, [map, onZoom]);
  return null;
}

export function RouteMap({
  state,
  live,
  scenarioMinute,
  selectedId,
  onSelectFlight,
  frameToken,
  liveSourceLine,
}: {
  state: SimulationState;
  live: boolean;
  scenarioMinute: ScenarioClock;
  selectedId: string;
  onSelectFlight: (id: string) => void;
  frameToken: number;
  liveSourceLine: string | null;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(5.25);
  const traffic = useMemo(() => buildRegionalTraffic(state), [state]);
  const selected = traffic.find((flight) => flight.id === selectedId) ?? traffic[0];
  const precip = precipZonesAt(scenarioMinute);

  const airborne = traffic
    .map((flight) => {
      const pose = flightPoseAt(flight, scenarioMinute);
      if (!pose) return null;
      if (!pose.airborne && pose.atAirport !== "origin" && pose.atAirport !== "destination") return null;
      if (!pose.airborne && pose.groundLabel) return null;
      return {
        id: flight.id,
        flight: flight.flight,
        position: pose.position,
        bearing: pose.bearing,
        selected: flight.id === selectedId,
        showLabel: flight.id === selectedId || flight.id === hoveredId,
        flightRow: flight,
        airborne: pose.airborne,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const clustered = useClusteredFlights(
    airborne.map((item) => ({ id: item.id, position: item.position, selected: item.selected })),
    zoom,
  );

  const mciGround = traffic
    .map((flight) => {
      const pose = flightPoseAt(flight, scenarioMinute);
      if (!pose?.groundLabel) return null;
      if (pose.atAirport !== "origin" && pose.atAirport !== "destination") return null;
      const atMci =
        (pose.atAirport === "origin" && flight.origin === AIRPORTS.MCI) ||
        (pose.atAirport === "destination" && flight.destination === AIRPORTS.MCI);
      if (!atMci) return null;
      return flight;
    })
    .filter((item): item is RegionalFlight => Boolean(item));

  const mciHint = mciGround.map((flight) => `${flight.flight} · ${flight.groundLabel ?? flight.status}`).join(" · ");

  const route = selected ? routeProgressPoints(selected, scenarioMinute) : null;

  return (
    <MapContainer center={[39.1, -98.4]} zoom={5.25} zoomSnap={0.25} zoomControl={false} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
      <ZoomControl position="topright" />
      <TileLayer attribution='&copy; <a href="https://carto.com/">CARTO</a>' url={NEUTRAL_TILES} opacity={0.82} />
      <TileLayer url={LABEL_TILES} opacity={0.65} />
      <MapZoomReporter onZoom={setZoom} />
      <MapCamera frameToken={frameToken} live={live} selected={live ? null : selected ?? null} />
      {live ? <LiveTools sourceLine={liveSourceLine} /> : null}
      {!live
        ? precip.map((zone, index) => (
            <Polygon
              key={`${zone.intensity}-${index}`}
              positions={zone.ring}
              pathOptions={{
                color: zone.intensity === "moderate" ? "#4f78b8" : "#8aaed4",
                weight: 1,
                fillColor: zone.intensity === "moderate" ? "#6d96d4" : "#a9c4e8",
                fillOpacity: zone.intensity === "moderate" ? 0.38 : 0.22,
              }}
            />
          ))
        : null}
      {route && !live ? (
        <>
          <Polyline positions={route.flown} pathOptions={{ color: "#16356f", weight: 3.5, opacity: 0.95 }} />
          <Polyline
            positions={route.remaining}
            pathOptions={{ color: "#16356f", weight: 2.5, opacity: 0.55, dashArray: "7 9" }}
          />
        </>
      ) : null}
      <Marker position={AIRPORTS.DEN} icon={airportIcon("DEN")} />
      <Marker position={AIRPORTS.MCI} icon={airportIcon("MCI", mciHint || undefined)} />
      {!live
        ? clustered.map((item) => {
            if (item.kind === "cluster") {
              return (
                <Marker
                  key={item.id}
                  position={item.position}
                  icon={clusterIcon(item.count)}
                  eventHandlers={{
                    click: () => onSelectFlight(item.id.split(",")[0] ?? selectedId),
                  }}
                />
              );
            }
            const meta = airborne.find((flight) => flight.id === item.id);
            if (!meta) return null;
            return (
              <Marker
                key={meta.id}
                position={meta.position}
                icon={trafficIcon(meta.flight, meta.bearing - 90, meta.selected, meta.showLabel)}
                zIndexOffset={meta.selected ? 500 : 200}
                eventHandlers={{
                  click: () => onSelectFlight(meta.id),
                  mouseover: () => setHoveredId(meta.id),
                  mouseout: () => setHoveredId((current) => (current === meta.id ? null : current)),
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={1} className="wx-plane-tooltip">
                  {meta.flight} · {meta.flightRow.status}
                </Tooltip>
              </Marker>
            );
          })
        : null}
    </MapContainer>
  );
}