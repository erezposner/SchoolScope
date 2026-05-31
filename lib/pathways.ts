import type { School } from "./types";

// ---------------------------------------------------------------------------
// We can't get a reliable address-level elementary→middle→high assignment from
// the free GreatSchools pages, so instead of guessing one specific (often wrong)
// chain we show the school's real DISTRICT structure, grouped by level so the
// elementary → middle → high progression is explicit:
//   • Elementary & Middle  = the school's actual K-8 district (exact)
//   • High                 = the high-school district that K-8 district feeds
// For unified (K-12) districts every level is the same district; for a selected
// high school we show the elementaries/middles that feed into it. A link to the
// official attendance-zone map gives the precise, address-level answer.
// ---------------------------------------------------------------------------

const HS_FEEDER: Record<string, string> = {
  "627": "630", // Cambrian SD        → Campbell Union HSD
  "646": "630", // Moreland SD        → Campbell Union HSD
  "657": "630", // Union SD           → Campbell Union HSD
  "631": "635", // Cupertino Union    → Fremont Union HSD
  "656": "635", // Sunnyvale SD       → Fremont Union HSD
  "655": "655", // San Jose Unified   → itself (K-12)
  "654": "654", // Santa Clara Unified → itself (K-12)
  "630": "630",
  "635": "635",
};

const HSD_NAME: Record<string, string> = {
  "630": "Campbell Union High School District",
  "635": "Fremont Union High School District",
};

function hsDistrictOf(district: string | null): string | null {
  if (district == null) return null;
  return HS_FEEDER[district] ?? district;
}

// Continuation / alternative campuses are public but aren't the comprehensive
// neighborhood high, so we keep them out of the cross-district "feeds into" set.
const ALT_RE = /continuation|alternative|opportunity|occupational|community day/i;

export type Level = "e" | "m" | "h";

export interface LevelGroup {
  level: Level;
  label: string;
  color: string;
  schools: School[];
}

export interface Pathway {
  selected: School;
  districtName: string | null;
  districtUrl: string | null;
  groups: LevelGroup[];
  highlightIds: Set<string>;
  /** on-map schools to connect to the selected school (cross-level only) */
  lineTargets: School[];
  /** name of the HS district a K-8 school feeds into (null otherwise) */
  hsLabel: string | null;
  /** authoritative GreatSchools attendance-zone boundary map for this school */
  zoneUrl: string;
}

const LEVEL_COLOR: Record<Level, string> = {
  e: "#fbbf24", // amber
  m: "#a78bfa", // violet
  h: "#22d3ee", // cyan
};
const LEVEL_LABEL: Record<Level, string> = {
  e: "Elementary",
  m: "Middle",
  h: "High",
};

export function pathwayFor(selected: School, all: School[]): Pathway {
  const k8 = String(selected.district);
  const hsd = hsDistrictOf(k8);
  const sameDistrict = all.filter((s) => String(s.district) === k8);
  const unifiedOrHS = hsd === k8;
  const isHSonly = sameDistrict.length > 0 && sameDistrict.every((s) => s.level === "h");

  const byLevel = (pool: School[], lvl: Level) => pool.filter((s) => s.level === lvl);
  const regionHighs = all.filter(
    (s) =>
      s.level === "h" &&
      hsDistrictOf(s.district) === hsd &&
      s.rating != null &&
      !ALT_RE.test(s.name),
  );

  let elems: School[];
  let middles: School[];
  let highs: School[];

  if (isHSonly) {
    // selected is a high school: show the elementaries / middles that feed it
    elems = all.filter((s) => s.level === "e" && hsDistrictOf(s.district) === hsd);
    middles = all.filter((s) => s.level === "m" && hsDistrictOf(s.district) === hsd);
    highs = byLevel(sameDistrict, "h");
  } else if (unifiedOrHS) {
    // unified K-12 district — every level is the same district
    elems = byLevel(sameDistrict, "e");
    middles = byLevel(sameDistrict, "m");
    highs = byLevel(sameDistrict, "h").filter((s) => !ALT_RE.test(s.name));
  } else {
    // K-8 district — own elementaries + middles, feeder HSD high schools
    elems = byLevel(sameDistrict, "e");
    middles = byLevel(sameDistrict, "m");
    highs = regionHighs;
  }

  const hsLabel = !unifiedOrHS && !isHSonly ? HSD_NAME[hsd ?? ""] ?? null : null;

  const groups: LevelGroup[] = (
    [
      { level: "e", label: LEVEL_LABEL.e, color: LEVEL_COLOR.e, schools: elems },
      { level: "m", label: LEVEL_LABEL.m, color: LEVEL_COLOR.m, schools: middles },
      {
        level: "h",
        label: hsLabel ? `High · ${hsLabel}` : LEVEL_LABEL.h,
        color: LEVEL_COLOR.h,
        schools: highs,
      },
    ] as LevelGroup[]
  ).filter((g) => g.schools.length > 0);

  const highlight = groups.flatMap((g) => g.schools);
  const highlightIds = new Set(highlight.map((s) => String(s.id)));
  highlightIds.add(String(selected.id));

  // Connect the selected school only to schools at OTHER levels, so the
  // elementary → middle → high structure reads clearly without intra-level mess.
  const lineTargets = highlight.filter(
    (s) =>
      String(s.id) !== String(selected.id) &&
      s.level !== selected.level &&
      s.lat != null &&
      s.lng != null,
  );

  const zoneUrl =
    "https://www.greatschools.org/school-district-boundaries-map/?" +
    `districtId=${selected.district ?? ""}&level=${selected.level ?? "e"}` +
    `&schoolId=${selected.id}&state=${selected.address.state ?? "CA"}`;

  return {
    selected,
    districtName: selected.districtName ?? null,
    districtUrl: selected.districtUrl ?? null,
    groups,
    highlightIds,
    lineTargets,
    hsLabel,
    zoneUrl,
  };
}
