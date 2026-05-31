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
  selected: School | null;
  onSelect: (id: School["id"]) => void;
  pathway: Pathway | null;
}

const LEVEL_LETTER: Record<string, string> = { e: "E", m: "M", h: "H" };

// Pan/zoom to the selected school when the selection changes (e.g. from search).
function FlyToSelected({ school }: { school: School | null }) {
  const map = useMap();
  useEffect(() => {
    if (school && school.lat != null && school.lng != null) {
      map.flyTo([school.lat, school.lng], Math.max(map.getZoom(), 13.5), {
        duration: 0.7,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [school?.id]);
  return null;
}

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
  selected,
  onSelect,
  pathway,
}: Props) {
  const highlightIds = pathway?.highlightIds ?? new Set<string>();
  const pathActive = highlightIds.size > 0;

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

  // Render highlighted schools (and the selected one) even if a filter would
  // hide them, so connections aren't broken and a searched school always shows.
  const rendered = [...schools];
  const extras = [...(pathway?.lineTargets ?? []), ...(selected ? [selected] : [])];
  for (const s of extras) {
    if (s.lat != null && !rendered.some((r) => r.id === s.id)) rendered.push(s);
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

  // On the light basemap, markers get a crisp dark outline for definition;
  // pathway nodes keep their level colour, the selected one a bold dark ring.
  const ringColor = (id: string, isSel: boolean) =>
    isSel ? "#0f172a" : colorById.get(id) ?? "rgba(15,23,42,0.45)";

  return (
    <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a> &middot; data: GreatSchools.org'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      <FitBounds schools={schools} />
      <FlyToSelected school={selected} />

      {/* District connectors (hub-and-spoke from selected school, by level).
          A soft white casing keeps the coloured dashes legible on the light map. */}
      {spokes.map(({ seg }, i) => (
        <Polyline
          key={`spoke-casing-${i}`}
          positions={seg}
          pathOptions={{ color: "#ffffff", weight: 4.5, opacity: 0.6, lineCap: "round" }}
        />
      ))}
      {spokes.map(({ seg, color }, i) => (
        <Polyline
          key={`spoke-${i}`}
          positions={seg}
          pathOptions={{
            color,
            weight: 2.4,
            opacity: 0.95,
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
