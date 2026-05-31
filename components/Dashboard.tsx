"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { School } from "@/lib/types";
import { METRIC_BY_KEY } from "@/lib/metrics";
import { AREAS, LEVELS, areaForSchool } from "@/lib/areas";
import { pathwayFor } from "@/lib/pathways";
import ControlPanel from "./ControlPanel";
import Legend from "./Legend";
import SchoolDetail from "./SchoolDetail";

// Leaflet touches `window`, so the map must be client-only (no SSR).
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "grid", placeItems: "center", height: "100%", color: "#94a3b8" }}>
      Loading map…
    </div>
  ),
});

export default function Dashboard({ schools: initialSchools }: { schools: School[] }) {
  const [schools, setSchools] = useState<School[]>(initialSchools);
  const [metricKey, setMetricKey] = useState<string>("rating");
  const [activeAreas, setActiveAreas] = useState<Set<string>>(
    // "other" (far / continuation schools pulled in only as pathway targets) is
    // off by default so it doesn't zoom the map out; pathway nodes still render.
    new Set(AREAS.filter((a) => a.key !== "other").map((a) => a.key)),
  );
  const [activeLevels, setActiveLevels] = useState<Set<string>>(
    new Set(LEVELS.map((l) => l.key)),
  );
  const [selectedId, setSelectedId] = useState<School["id"] | null>(null);

  const metric = METRIC_BY_KEY[metricKey];

  const visible = useMemo(
    () =>
      schools.filter(
        (s) =>
          activeAreas.has(areaForSchool(s)) &&
          activeLevels.has(s.level ?? "e"),
      ),
    [schools, activeAreas, activeLevels],
  );

  const [showPathway, setShowPathway] = useState(true);

  const selected = useMemo(
    () => schools.find((s) => s.id === selectedId) ?? null,
    [schools, selectedId],
  );

  // The feeder chain (elementary → middle → high) the selected school belongs
  // to. Computed over ALL schools so the pathway isn't broken by area/level
  // filters that might hide a coupled school.
  const pathway = useMemo(
    () => (selected && showPathway ? pathwayFor(selected, schools) : null),
    [selected, schools, showPathway],
  );

  function toggleArea(key: string) {
    setActiveAreas((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      // never allow zero areas — keep at least the one just clicked
      if (next.size === 0) next.add(key);
      return next;
    });
  }

  function toggleLevel(key: string) {
    setActiveLevels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      if (next.size === 0) next.add(key);
      return next;
    });
  }

  function onSchoolAdded(school: School) {
    setSchools((prev) => {
      const i = prev.findIndex((s) => String(s.id) === String(school.id));
      if (i >= 0) {
        const copy = prev.slice();
        copy[i] = school;
        return copy;
      }
      return [...prev, school];
    });
    setSelectedId(school.id);
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <ControlPanel
          schools={schools}
          metricKey={metricKey}
          onMetricChange={setMetricKey}
          activeAreas={activeAreas}
          onToggleArea={toggleArea}
          activeLevels={activeLevels}
          onToggleLevel={toggleLevel}
          onSchoolAdded={onSchoolAdded}
        />
      </aside>

      <div className="map-wrap">
        <MapView
          schools={visible}
          metric={metric}
          selectedId={selectedId}
          onSelect={setSelectedId}
          pathway={pathway}
        />
        <Legend metric={metric} schools={visible} />
        {selected && (
          <SchoolDetail
            school={selected}
            pathway={pathway}
            showPathway={showPathway}
            onTogglePathway={() => setShowPathway((v) => !v)}
            onSelect={setSelectedId}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  );
}
