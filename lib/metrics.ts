import type { School } from "./types";

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToCss([r, g, b]: RGB, alpha = 1): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

// Interpolate across an arbitrary list of hex stops. t in [0,1].
function sampleScale(stops: string[], t: number): RGB {
  const clamped = Math.max(0, Math.min(1, t));
  const seg = clamped * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(seg));
  const f = seg - i;
  const a = hexToRgb(stops[i]);
  const b = hexToRgb(stops[i + 1]);
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

// Color ramps. These are perceptually-uniform, multi-hue palettes chosen to
// read well on a DARK basemap: luminance AND hue both climb with the value, so
// "bright / warm = high" is unambiguous (the old single-hue ramps washed out on
// dark and made it impossible to rank schools at a glance).
const RAMPS = {
  // Quality (higher = better): vivid red (bad) -> yellow -> green (best).
  redGreen: ["#e11d48", "#fb923c", "#fde047", "#a3e635", "#22c55e", "#15803d"],
  // viridis — dark violet -> teal -> bright yellow. Default magnitude ramp.
  viridis: ["#440154", "#414487", "#2a788e", "#22a884", "#7ad151", "#fde725"],
  // plasma — deep blue -> magenta -> orange -> bright yellow.
  plasma: ["#0d0887", "#6a00a8", "#b12a90", "#e16462", "#fca636", "#f0f921"],
  // magma — black-violet -> magenta -> warm cream.
  magma: ["#1b0c41", "#4a0c6b", "#a52c60", "#de4968", "#fe9f6d", "#fcfdbf"],
  // turbo — max contrast: blue -> cyan -> green -> yellow -> red.
  turbo: ["#30123b", "#4669f2", "#1bd0d5", "#a4fc3c", "#fb8022", "#d23105"],
} as const;

// ---------------------------------------------------------------------------
// Metric definitions
// ---------------------------------------------------------------------------

export interface MetricDef {
  key: string;
  label: string;
  group: "overview" | "equity" | "staffing" | "demographics";
  unit: string;
  /** domain [min, max] used to normalize values to 0..1 */
  domain: [number, number];
  ramp: keyof typeof RAMPS;
  /** if true, higher raw value = "better" (affects legend wording only) */
  higherIsBetter?: boolean;
  description: string;
  accessor: (s: School) => number | null;
  /** format a raw value for display */
  format: (v: number | null) => string;
}

const pct = (v: number | null) => (v == null ? "—" : `${v}%`);
const plain = (v: number | null) => (v == null ? "—" : `${v}`);

const demo = (key: string): ((s: School) => number | null) => (s) =>
  s.demographics[key] ?? null;

export const METRICS: MetricDef[] = [
  {
    key: "rating",
    label: "GreatSchools Rating",
    group: "overview",
    unit: "/10",
    domain: [1, 10],
    ramp: "redGreen",
    higherIsBetter: true,
    description:
      "Overall GreatSchools rating (1–10) based on academic quality, equity and test scores.",
    accessor: (s) => s.metrics.rating,
    format: (v) => (v == null ? "—" : `${v}/10`),
  },
  {
    key: "lowIncome",
    label: "% Low-Income Students",
    group: "equity",
    unit: "%",
    domain: [0, 80],
    ramp: "plasma",
    description:
      "Share of students who are economically disadvantaged (eligible for free/reduced lunch).",
    accessor: (s) => s.metrics.lowIncome,
    format: pct,
  },
  {
    key: "englishLearners",
    label: "% English Learners",
    group: "equity",
    unit: "%",
    domain: [0, 50],
    ramp: "magma",
    description: "Share of students classified as English language learners.",
    accessor: (s) => s.metrics.englishLearners,
    format: pct,
  },
  {
    key: "studentsPerTeacher",
    label: "Students per Teacher",
    group: "staffing",
    unit: "",
    domain: [10, 30],
    ramp: "turbo",
    description:
      "Average number of students per full-time teacher (not the same as class size).",
    accessor: (s) => s.metrics.studentsPerTeacher,
    format: plain,
  },
  {
    key: "pctCertifiedTeachers",
    label: "% Certified Teachers",
    group: "staffing",
    unit: "%",
    domain: [70, 100],
    ramp: "redGreen",
    higherIsBetter: true,
    description: "Share of full-time teachers meeting state certification requirements.",
    accessor: (s) => s.metrics.pctCertifiedTeachers,
    format: pct,
  },
  {
    key: "demo_asian",
    label: "% Asian",
    group: "demographics",
    unit: "%",
    domain: [0, 80],
    ramp: "viridis",
    description: "Share of students identifying as Asian.",
    accessor: demo("Asian"),
    format: pct,
  },
  {
    key: "demo_hispanic",
    label: "% Hispanic",
    group: "demographics",
    unit: "%",
    domain: [0, 80],
    ramp: "viridis",
    description: "Share of students identifying as Hispanic/Latino.",
    accessor: demo("Hispanic"),
    format: pct,
  },
  {
    key: "demo_white",
    label: "% White",
    group: "demographics",
    unit: "%",
    domain: [0, 80],
    ramp: "viridis",
    description: "Share of students identifying as White.",
    accessor: demo("White"),
    format: pct,
  },
  {
    key: "demo_two",
    label: "% Two+ Races",
    group: "demographics",
    unit: "%",
    domain: [0, 30],
    ramp: "viridis",
    description: "Share of students identifying as two or more races.",
    accessor: demo("Two or more races"),
    format: pct,
  },
  {
    key: "demo_filipino",
    label: "% Filipino",
    group: "demographics",
    unit: "%",
    domain: [0, 20],
    ramp: "viridis",
    description: "Share of students identifying as Filipino.",
    accessor: demo("Filipino"),
    format: pct,
  },
  {
    key: "demo_black",
    label: "% Black",
    group: "demographics",
    unit: "%",
    domain: [0, 20],
    ramp: "viridis",
    description: "Share of students identifying as Black/African American.",
    accessor: demo("Black"),
    format: pct,
  },
];

export const METRIC_BY_KEY: Record<string, MetricDef> = Object.fromEntries(
  METRICS.map((m) => [m.key, m]),
);

// Normalize a school's value for a metric to 0..1 across its domain.
export function normalize(metric: MetricDef, value: number | null): number | null {
  if (value == null) return null;
  const [min, max] = metric.domain;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

// Color for a school under a metric (CSS rgba string). Null → neutral grey.
export function colorFor(metric: MetricDef, value: number | null, alpha = 1): string {
  const t = normalize(metric, value);
  if (t == null) return `rgba(160,160,160,${alpha})`;
  return rgbToCss(sampleScale([...RAMPS[metric.ramp]], t), alpha);
}

// Marker radius for a value — double-encodes magnitude as size so the highest
// schools literally stand out as the biggest dots. Null values get a small dot.
export function markerRadius(
  metric: MetricDef,
  value: number | null,
  { selected = false } = {},
): number {
  const t = normalize(metric, value);
  const base = 7; // min radius
  const span = 9; // growth range
  const r = t == null ? base : base + t * span;
  return selected ? r + 4 : r;
}

// Sample a metric's ramp at fractional position t (for legend gradients).
export function rampColorAt(metric: MetricDef, t: number): string {
  return rgbToCss(sampleScale([...RAMPS[metric.ramp]], t));
}

// CSS linear-gradient string spanning the metric ramp left→right.
export function rampGradient(metric: MetricDef): string {
  const stops = RAMPS[metric.ramp]
    .map((_, i, a) => rampColorAt(metric, i / (a.length - 1)))
    .map((c, i, a) => `${c} ${(i / (a.length - 1)) * 100}%`)
    .join(", ");
  return `linear-gradient(to right, ${stops})`;
}

// Consistent colors for demographic stacked bars in the detail panel.
export const DEMO_COLORS: Record<string, string> = {
  Asian: "#3182bd",
  Hispanic: "#e6550d",
  White: "#31a354",
  "Two or more races": "#756bb1",
  Filipino: "#2ca25f",
  Black: "#393b79",
  "Native American": "#8c6d31",
  "Pacific Islander": "#d6616b",
  Unspecified: "#969696",
};

export function demoColor(name: string): string {
  return DEMO_COLORS[name] ?? "#bdbdbd";
}
