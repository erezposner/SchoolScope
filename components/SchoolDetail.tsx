"use client";

import type { School } from "@/lib/types";
import { colorFor, demoColor, METRIC_BY_KEY } from "@/lib/metrics";
import { AREA_BY_KEY, areaForSchool } from "@/lib/areas";
import type { Pathway } from "@/lib/pathways";

const LEVEL_LABEL: Record<string, string> = { e: "Elementary", m: "Middle", h: "High" };

export default function SchoolDetail({
  school,
  pathway,
  showPathway,
  onTogglePathway,
  onSelect,
  onClose,
}: {
  school: School;
  pathway: Pathway | null;
  showPathway: boolean;
  onTogglePathway: () => void;
  onSelect: (id: School["id"]) => void;
  onClose: () => void;
}) {
  const area = AREA_BY_KEY[areaForSchool(school)];
  const ratingColor = colorFor(METRIC_BY_KEY.rating, school.rating, 1);

  const demos = Object.entries(school.demographics)
    .filter(([, v]) => v != null && (v as number) > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number));

  const stats: { label: string; value: string }[] = [
    { label: "Low income", value: fmtPct(school.metrics.lowIncome) },
    { label: "English learners", value: fmtPct(school.metrics.englishLearners) },
    { label: "Students / teacher", value: fmtNum(school.metrics.studentsPerTeacher) },
    { label: "Certified teachers", value: fmtPct(school.metrics.pctCertifiedTeachers) },
  ];

  return (
    <div className="detail">
      <button className="close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <h2>{school.name}</h2>
      <p className="sub">
        {school.grades ? `Grades ${school.grades} · ` : ""}
        {school.level ? `${LEVEL_LABEL[school.level] ?? school.level} · ` : ""}
        {area ? area.label : "South Bay"}
        <br />
        {school.address.full ?? ""}
        {school.districtName && (
          <>
            <br />
            🏛{" "}
            {school.districtUrl ? (
              <a href={school.districtUrl} target="_blank" rel="noreferrer">
                {school.districtName}
              </a>
            ) : (
              school.districtName
            )}
          </>
        )}
      </p>

      <span className="rating-badge" style={{ background: ratingColor }}>
        {school.rating ?? "—"}
        <span style={{ fontSize: 10, opacity: 0.8 }}>/10</span>
        <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.8 }}>GreatSchools</span>
      </span>

      <div className="stat-grid">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <div className="v">{s.value}</div>
            <div className="l">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="pathway-head">
        <p className="section-title" style={{ margin: 0 }}>
          {pathway?.districtName ?? "District & feeder schools"}
        </p>
        <button className="pathway-toggle" onClick={onTogglePathway}>
          {showPathway ? "Hide" : "Show"}
        </button>
      </div>
      {pathway ? (
        <>
          {pathway.groups.map((g, gi) => (
            <div key={g.level} style={{ marginTop: gi === 0 ? 0 : 10 }}>
              <div className="rel-group-label">
                <span className="rel-swatch" style={{ background: g.color }} />
                {g.label} ({g.schools.length})
              </div>
              <div className="rel-list">
                {g.schools
                  .slice()
                  .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
                  .map((s) => (
                    <RelRow
                      key={String(s.id)}
                      school={s}
                      current={String(s.id) === String(school.id)}
                      onSelect={onSelect}
                    />
                  ))}
              </div>
            </div>
          ))}

          <p className="pathway-note">
            Grouped by <b>actual school district</b> (exact). Lines on the map link this
            school to its district&rsquo;s middle and high schools. The specific campus a
            home is assigned to depends on its attendance boundary —{" "}
            <a href={pathway.zoneUrl} target="_blank" rel="noreferrer">
              view the official attendance-zone map ↗
            </a>
            .
          </p>
        </>
      ) : (
        <p className="sub" style={{ marginTop: 4 }}>
          Hidden — toggle to show this school&rsquo;s district family and feeder high schools.
        </p>
      )}

      {demos.length > 0 && (
        <>
          <p className="section-title" style={{ marginBottom: 4 }}>
            Student demographics
          </p>
          <div className="demo-bar">
            {demos.map(([name, v]) => (
              <div
                key={name}
                title={`${name}: ${v}%`}
                style={{ width: `${v}%`, background: demoColor(name) }}
              />
            ))}
          </div>
          <div className="demo-legend">
            {demos.map(([name, v]) => (
              <div className="demo-row" key={name}>
                <span className="demo-dot" style={{ background: demoColor(name) }} />
                {name}
                <span className="pct">{v}%</span>
              </div>
            ))}
          </div>
        </>
      )}

      <a className="gs-link" href={school.url} target="_blank" rel="noreferrer">
        View full profile on GreatSchools →
      </a>
    </div>
  );
}

function RelRow({
  school,
  current,
  onSelect,
}: {
  school: School;
  current: boolean;
  onSelect: (id: School["id"]) => void;
}) {
  return (
    <button
      className={`rel-row ${current ? "current" : ""}`}
      onClick={() => onSelect(school.id)}
      title={school.name}
    >
      <span
        className="rel-dot"
        style={{ background: colorFor(METRIC_BY_KEY.rating, school.rating, 1) }}
      >
        {school.rating ?? "—"}
      </span>
      <span className="rel-name">{shortName(school.name)}</span>
      <span className="rel-level">{LEVEL_LABEL[school.level ?? ""] ?? ""}</span>
    </button>
  );
}

function fmtPct(v: number | null) {
  return v == null ? "—" : `${v}%`;
}
function fmtNum(v: number | null) {
  return v == null ? "—" : `${v}`;
}
function shortName(name: string) {
  return name
    .replace(/ (Elementary|Middle|High) School$/, "")
    .replace(/ Charter School$/, "")
    .replace(/ School$/, "");
}
