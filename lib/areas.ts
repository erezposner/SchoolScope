import type { School } from "./types";

// With coverage spanning many Bay Area cities across two counties, schools are
// grouped by their actual city (from the scraped address) rather than by
// hand-drawn bounding boxes. This scales automatically to whatever cities are
// present in the dataset.

export function areaForSchool(s: School): string {
  const c = s.address?.city?.trim();
  return c && c.length ? c : "Other";
}

// Distinct, stable color per city (hashed into a palette).
const PALETTE = [
  "#2563eb", // blue
  "#0891b2", // cyan
  "#db2777", // pink
  "#7c3aed", // violet
  "#059669", // green
  "#d97706", // amber
  "#dc2626", // red
  "#0d9488", // teal
  "#9333ea", // purple
  "#ca8a04", // gold
  "#4f46e5", // indigo
  "#16a34a", // emerald
  "#e11d48", // rose
  "#0ea5e9", // sky
];

export function areaColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// Areas present in a dataset, with counts and colors, sorted by size.
export function areasFromSchools(
  schools: School[],
): { key: string; label: string; color: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const s of schools) {
    const k = areaForSchool(s);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: key, color: areaColor(key), count }))
    .sort((a, b) => b.count - a.count);
}

// School levels. GreatSchools' `level` can be a comma list for span schools,
// e.g. "e,m" (K-8) or "p,e,m,h" (p = preschool, which we ignore).
export const LEVELS: { key: string; label: string; icon: string }[] = [
  { key: "e", label: "Elementary", icon: "🟢" },
  { key: "m", label: "Middle", icon: "🔵" },
  { key: "h", label: "High", icon: "🟣" },
];

export type Lvl = "e" | "m" | "h";

export function levelsOf(s: School): Lvl[] {
  return String(s.level ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter((x): x is Lvl => x === "e" || x === "m" || x === "h");
}

// Single representative level (lowest grade band present) for the pathway/icons.
export function primaryLevel(s: School): Lvl {
  return levelsOf(s)[0] ?? "e";
}

// Human label, collapsing spans (K-8, K-12, 6-12).
export function levelLabel(s: School): string {
  const ls = levelsOf(s);
  if (ls.length === 0) return "School";
  if (ls.length === 1) return { e: "Elementary", m: "Middle", h: "High" }[ls[0]];
  const first = ls[0];
  const last = ls[ls.length - 1];
  if (first === "e" && last === "m") return "K-8";
  if (first === "e" && last === "h") return "K-12";
  if (first === "m" && last === "h") return "6-12";
  return ls.map((l) => ({ e: "Elem", m: "Mid", h: "High" })[l]).join("/");
}

// Center/zoom roughly framing the South Bay → Peninsula (FitBounds refines it).
export const DEFAULT_CENTER: [number, number] = [37.36, -122.05];
export const DEFAULT_ZOOM = 10;
