"use client";

import { useState } from "react";
import type { School } from "@/lib/types";
import { METRICS, type MetricDef, rampColorAt } from "@/lib/metrics";
import { AREAS, LEVELS, areaForSchool } from "@/lib/areas";

const GROUP_LABELS: Record<MetricDef["group"], string> = {
  overview: "Overview",
  equity: "Equity & Income",
  staffing: "Teachers & Staffing",
  demographics: "Demographics",
};

interface Props {
  schools: School[];
  metricKey: string;
  onMetricChange: (k: string) => void;
  activeAreas: Set<string>;
  onToggleArea: (k: string) => void;
  activeLevels: Set<string>;
  onToggleLevel: (k: string) => void;
  onSchoolAdded: (s: School) => void;
}

export default function ControlPanel(props: Props) {
  const {
    schools,
    metricKey,
    onMetricChange,
    activeAreas,
    onToggleArea,
    activeLevels,
    onToggleLevel,
    onSchoolAdded,
  } = props;

  const levelCounts = LEVELS.map((l) => ({
    ...l,
    count: schools.filter((s) => (s.level ?? "e") === l.key).length,
  }));

  // Only show area pills that actually contain schools (hides empty "Other").
  const areaCounts = AREAS.map((a) => ({
    ...a,
    count: schools.filter((s) => areaForSchool(s) === a.key).length,
  })).filter((a) => a.count > 0);

  const groups = ["overview", "equity", "staffing", "demographics"] as const;

  return (
    <>
      <div className="brand">
        <h1>🔭 SchoolScope</h1>
        <p>
          South Bay public schools — {schools.length} mapped. Pick a metric to recolor &amp;
          resize the markers; click any school for its district family and stats.
        </p>
      </div>

      <div>
        <p className="section-title">Areas</p>
        <div className="pills">
          {areaCounts.map((a) => (
            <button
              key={a.key}
              className={`pill ${activeAreas.has(a.key) ? "active" : ""}`}
              onClick={() => onToggleArea(a.key)}
              style={
                activeAreas.has(a.key)
                  ? { background: a.color, borderColor: a.color, color: "#fff" }
                  : undefined
              }
            >
              {a.label} <span style={{ opacity: 0.7 }}>({a.count})</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="section-title">School Level</p>
        <div className="pills">
          {levelCounts.map((l) => (
            <button
              key={l.key}
              className={`pill ${activeLevels.has(l.key) ? "active" : ""}`}
              onClick={() => onToggleLevel(l.key)}
            >
              {l.label} <span style={{ opacity: 0.7 }}>({l.count})</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="section-title">Metric Overlay</p>
        {groups.map((g) => (
          <div className="metric-group" key={g}>
            <div style={{ fontSize: 11, color: "#64748b", margin: "0 0 4px 2px" }}>
              {GROUP_LABELS[g]}
            </div>
            {METRICS.filter((m) => m.group === g).map((m) => (
              <button
                key={m.key}
                className={`metric-btn ${metricKey === m.key ? "active" : ""}`}
                onClick={() => onMetricChange(m.key)}
              >
                <span
                  className="metric-swatch"
                  style={{
                    background: `linear-gradient(135deg, ${rampColorAt(m, 0.15)}, ${rampColorAt(
                      m,
                      0.85,
                    )})`,
                  }}
                />
                {m.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <AddSchool onSchoolAdded={onSchoolAdded} />

      <div className="footnote">
        Data scraped live from GreatSchools.org (CA Dept. of Education, 2025). Ratings 1–10.
        Coordinates via OpenStreetMap. This is an independent educational visualization, not
        affiliated with GreatSchools.
      </div>
    </>
  );
}

function AddSchool({ onSchoolAdded }: { onSchoolAdded: (s: School) => void }) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setStatus("Scraping GreatSchools…");
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scrape failed");
      if (data.school.lat == null) {
        setStatus(`Added ${data.school.name} (no coordinates — not mapped)`);
      } else {
        setStatus(`✓ Added ${data.school.name}`);
        onSchoolAdded(data.school);
      }
      setUrl("");
    } catch (err) {
      setStatus(`✗ ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="section-title">Add a School</p>
      <form className="add-form" onSubmit={submit}>
        <input
          type="url"
          placeholder="Paste a greatschools.org/california/… URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={busy}
        />
        <button type="submit" disabled={busy}>
          {busy ? "Scraping…" : "Scrape & Add"}
        </button>
        <div className="add-status">{status}</div>
      </form>
    </div>
  );
}
