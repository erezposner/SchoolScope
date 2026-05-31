import type { School } from "./types";

export interface AreaDef {
  key: string;
  label: string;
  color: string;
  /** [south, west, north, east] — omitted for the catch-all area */
  bounds?: [number, number, number, number];
}

// Bounding boxes for each cluster. Order matters: areaForSchool returns the
// FIRST box a school falls inside, so more specific / western boxes come first.
// Anything outside every box falls back to the "other" catch-all so a newly
// scraped school is never silently hidden by the area filter.
export const AREAS: AreaDef[] = [
  {
    key: "losaltos",
    label: "Los Altos",
    color: "#d97706",
    bounds: [37.335, -122.135, 37.43, -122.08],
  },
  {
    key: "sunnyvale",
    label: "Sunnyvale",
    color: "#2563eb",
    bounds: [37.355, -122.085, 37.42, -121.965],
  },
  {
    key: "cupertino",
    label: "Cupertino / West Valley",
    color: "#0891b2",
    bounds: [37.285, -122.085, 37.355, -121.995],
  },
  {
    key: "westsanjose",
    label: "West San Jose",
    color: "#db2777",
    bounds: [37.27, -122.0, 37.335, -121.928],
  },
  {
    key: "cambrian",
    label: "Cambrian",
    color: "#7c3aed",
    bounds: [37.235, -121.97, 37.295, -121.888],
  },
  {
    key: "almaden",
    label: "Almaden",
    color: "#059669",
    bounds: [37.195, -121.92, 37.275, -121.82],
  },
  {
    key: "other",
    label: "Other / Nearby",
    color: "#6b7280",
  },
];

export function areaForSchool(s: School): string {
  if (s.lat == null || s.lng == null) return "other";
  for (const a of AREAS) {
    if (!a.bounds) continue;
    const [s0, w, n, e] = a.bounds;
    if (s.lat >= s0 && s.lat <= n && s.lng >= w && s.lng <= e) return a.key;
  }
  return "other";
}

export const AREA_BY_KEY: Record<string, AreaDef> = Object.fromEntries(
  AREAS.map((a) => [a.key, a]),
);

// School levels (gon `level` field: e / m / h).
export const LEVELS: { key: string; label: string; icon: string }[] = [
  { key: "e", label: "Elementary", icon: "🟢" },
  { key: "m", label: "Middle", icon: "🔵" },
  { key: "h", label: "High", icon: "🟣" },
];

// Center/zoom that frames all clusters (FitBounds refines this at runtime).
export const DEFAULT_CENTER: [number, number] = [37.3, -121.96];
export const DEFAULT_ZOOM = 11;
