"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { School } from "@/lib/types";
import { type MetricDef, colorFor, markerRadius } from "@/lib/metrics";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/areas";
import type { Pathway } from "@/lib/pathways";

interface Props {
  schools: School[];
  metric: MetricDef;
  selectedId: School["id"] | null;
  onSelect: (id: School["id"]) => void;
  pathway: Pathway | null;
}

const LEVEL_LETTER: Record<string, string> = { e: "E", m: "M", h: "H" };

// Fit the map to the visible schools whenever the set changes.
function FitBounds({ schools }: { schools: School[] }) {
  const map = useMap();
  useEffect(() => {
    const pts = schools
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => [s.lat as number, s.lng as number] as [number, number]);
    if (pts.length >= 2) {
      map.fitBounds(pts, { padding: [60, 60], maxZoom: 13 });
    } else if (pts.length === 1) {
      map.setView(pts[0], 14);
    }
  }, [map, schools]);
  return null;
}

export default function MapView({
  schools,
  metric,
  selectedId,
  onSelect,
  pathway,
}: Props) {
  const highlightIds = pathway?.highlightIds ?? new Set<string>();
  const pathActive = highlightIds.size > 0;
  const selected = pathway?.selected ?? null;

  // level + color per highlighted school id, for ring colors
  const colorById = new Map<string, string>();
  if (pathway) {
    for (const g of pathway.groups) {
      for (const s of g.schools) colorById.set(String(s.id), g.color);
    }
  }
  const LEVEL_RING: Record<string, string> = {
    e: "#fbbf24",
    m: "#a78bfa",
    h: "#22d3ee",
  };

  // Render highlighted schools even if a filter would hide them, so the
  // connections are never broken. Merge them into the render set (deduped).
  const rendered = [...schools];
  for (const s of pathway?.lineTargets ?? []) {
    if (!rendered.some((r) => r.id === s.id)) rendered.push(s);
  }

  // hub-and-spoke connectors from the selected school to each related school,
  // coloured by the target's level so the e→m→h progression reads clearly
  const spokes: { seg: [number, number][]; color: string }[] =
    selected && selected.lat != null
      ? (pathway?.lineTargets ?? []).map((t) => ({
          seg: [
            [selected.lat as number, selected.lng as number],
            [t.lat as number, t.lng as number],
          ],
          color: LEVEL_RING[t.level ?? "e"] ?? "#fde047",
        }))
      : [];

  const ringColor = (id: string, isSel: boolean) =>
    isSel ? "#ffffff" : colorById.get(id) ?? "rgba(255,255,255,0.55)";

  return (
    <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &middot; data: GreatSchools.org'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <FitBounds schools={schools} />

      {/* District connectors (hub-and-spoke from selected school, by level) */}
      {spokes.map(({ seg, color }, i) => (
        <Polyline
          key={`spoke-${i}`}
          positions={seg}
          pathOptions={{
            color,
            weight: 1.8,
            opacity: 0.7,
            dashArray: "1 7",
            lineCap: "round",
          }}
        />
      ))}

      {rendered.map((s) => {
        const value = metric.accessor(s);
        const isSel = s.id === selectedId;
        const onPath = highlightIds.has(String(s.id));
        const fill = colorFor(metric, value, 1);
        const radius = markerRadius(metric, value, {
          selected: isSel || onPath,
        });
        const dimmed = pathActive && !onPath;
        return (
          <CircleMarker
            key={String(s.id)}
            center={[s.lat as number, s.lng as number]}
            radius={radius}
            pathOptions={{
              color: ringColor(String(s.id), isSel),
              weight: isSel ? 3 : onPath ? 2.8 : 1.25,
              fillColor: fill,
              fillOpacity: dimmed ? 0.22 : 1,
              opacity: dimmed ? 0.4 : 1,
            }}
            eventHandlers={{ click: () => onSelect(s.id) }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1}>
              <span className="school-tooltip">
                {onPath ? `${LEVEL_LETTER[s.level ?? ""] ?? ""} · ` : ""}
                {s.name}
              </span>
              <br />
              {metric.label}: <b>{metric.format(value)}</b>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
