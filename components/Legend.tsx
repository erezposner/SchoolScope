"use client";

import type { School } from "@/lib/types";
import { type MetricDef, rampGradient } from "@/lib/metrics";

export default function Legend({
  metric,
  schools,
}: {
  metric: MetricDef;
  schools: School[];
}) {
  const values = schools
    .map((s) => metric.accessor(s))
    .filter((v): v is number => v != null);
  const avg =
    values.length > 0
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
      : null;
  const [min, max] = metric.domain;

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
      </div>
    </div>
  );
}
