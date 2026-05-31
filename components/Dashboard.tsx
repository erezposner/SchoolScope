"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

  // District family / feeder connections are opt-in — hidden until the user
  // clicks "Show" in the detail panel, so selecting a school stays uncluttered.
  const [showPathway, setShowPathway] = useState(false);

  // Mobile: the sidebar is an off-canvas drawer (no effect on desktop layout).
  const [controlsOpen, setControlsOpen] = useState(false);

  // Selecting a school also closes the mobile drawer so the map is visible.
  function selectSchool(id: School["id"] | null) {
    setSelectedId(id);
    setControlsOpen(false);
  }

  // Back-button handling: while a school sheet is open, the browser/Android
  // Back button should close the sheet instead of leaving the site. We push one
  // history entry when a sheet opens and pop it (close) on `popstate`.
  const pushedHistory = useRef(false);
  useEffect(() => {
    if (selectedId == null) return;
    if (!pushedHistory.current) {
      window.history.pushState({ schoolSheet: true }, "");
      pushedHistory.current = true;
    }
    const onPop = () => {
      pushedHistory.current = false; // browser already popped our entry
      setSelectedId(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [selectedId]);

  // Close from the UI (×, drag, backdrop) — also consume the pushed history
  // entry so the Back button stays in sync.
  function closeSchool() {
    if (pushedHistory.current) {
      pushedHistory.current = false;
      window.history.back();
    }
    setSelectedId(null);
  }

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
      {/* Mobile-only: open the controls drawer */}
      <button
        className="mobile-fab"
        onClick={() => setControlsOpen(true)}
        aria-label="Open filters and search"
      >
        ☰ Filters
      </button>

      {/* Mobile-only: tap-out backdrop behind the open drawer */}
      {controlsOpen && (
        <div className="drawer-backdrop" onClick={() => setControlsOpen(false)} />
      )}

      <aside className={`sidebar ${controlsOpen ? "open" : ""}`}>
        <button
          className="sidebar-close"
          onClick={() => setControlsOpen(false)}
          aria-label="Close filters"
        >
          ×
        </button>
        <ControlPanel
          schools={schools}
          metricKey={metricKey}
          onMetricChange={setMetricKey}
          activeAreas={activeAreas}
          onToggleArea={toggleArea}
          activeLevels={activeLevels}
          onToggleLevel={toggleLevel}
          onSelectSchool={selectSchool}
          onSchoolAdded={onSchoolAdded}
        />
      </aside>

      <div className="map-wrap">
        <MapView
          schools={visible}
          metric={metric}
          selectedId={selectedId}
          selected={selected}
          onSelect={selectSchool}
          pathway={pathway}
        />
        <Legend metric={metric} schools={visible} />
        {selected && (
          <SchoolDetail
            school={selected}
            pathway={pathway}
            showPathway={showPathway}
            onTogglePathway={() => setShowPathway((v) => !v)}
            onSelect={selectSchool}
            onClose={closeSchool}
          />
        )}
      </div>
    </div>
  );
}
