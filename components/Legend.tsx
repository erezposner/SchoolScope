"use client";

import type { School } from "@/lib/types";
import { type MetricDef, rampGradient } from "@/lib/metrics";

export default function Legend({
  metric,
  schools,
  range,
  onRangeChange,
}: {
  metric: MetricDef;
  schools: School[];
  range: [number, number];
  onRangeChange: (r: [number, number]) => void;
}) {
  const values = schools
    .map((s) => metric.accessor(s))
    .filter((v): v is number => v != null);
  const avg =
    values.length > 0
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
      : null;
  const [min, max] = metric.domain;
  const [rmin, rmax] = range;
  const step = max - min <= 20 ? 1 : Math.max(1, Math.round((max - min) / 50));
  const filtered = rmin > min || rmax < max;
  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  return (
    <div className="legend">
      <h4>{metric.label}</h4>
      <p className="desc">{metric.description}</p>
      <div className="legend-bar" style={{ background: rampGradient(metric) }} />
      <div className="legend-scale">
        <span>
          {min}
          {metric.unit} {metric.higherIsBetter ? "· worst" : "· low"}
        </span>
        <span>
          {Math.round((min + max) / 2)}
          {metric.unit}
        </span>
        <span>
          {max}
          {metric.unit} {metric.higherIsBetter ? "· best ✓" : "· high"}
        </span>
      </div>

      {/* Range filter — show only schools whose value falls in [rmin, rmax].
          The value label sits on its own row so the track width never shifts. */}
      <div className="range-filter">
        <div className="range-head">
          <span className="range-label">Filter range</span>
          <span className="range-vals">
            {metric.format(rmin)} – {metric.format(rmax)}
          </span>
          {filtered && (
            <button
              className="range-reset"
              onClick={() => onRangeChange([min, max])}
              aria-label="Reset filter"
              title="Reset filter"
            >
              Reset ×
            </button>
          )}
        </div>
        <div className="range-track">
          <div
            className="range-fill"
            style={{ left: `${pct(rmin)}%`, right: `${100 - pct(rmax)}%` }}
          />
          <input
            type="range"
            className="range-input"
            min={min}
            max={max}
            step={step}
            value={rmin}
            aria-label={`Minimum ${metric.label}`}
            onChange={(e) => onRangeChange([Math.min(+e.target.value, rmax), rmax])}
          />
          <input
            type="range"
            className="range-input"
            min={min}
            max={max}
            step={step}
            value={rmax}
            aria-label={`Maximum ${metric.label}`}
            onChange={(e) => onRangeChange([rmin, Math.max(+e.target.value, rmin)])}
          />
        </div>
      </div>

      <div className="legend-size">
        <span className="dot sm" />
        <span className="dot md" />
        <span className="dot lg" />
        <span style={{ marginLeft: 6 }}>bigger dot = higher value</span>
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>
        Showing <b style={{ color: "#e5e7eb" }}>{schools.length}</b> schools
        {avg != null && (
          <>
            {" "}
            · avg <b style={{ color: "#e5e7eb" }}>{metric.format(avg)}</b>
          </>
        )}
        {filtered && <span style={{ color: "#38bdf8" }}> · filtered</span>}
      </div>
    </div>
  );
}
