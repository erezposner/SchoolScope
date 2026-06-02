"use client";

import { useRef } from "react";
import type { School } from "@/lib/types";
import { colorFor, demoColor, METRIC_BY_KEY } from "@/lib/metrics";
import { areaForSchool, levelLabel } from "@/lib/areas";
import type { Pathway } from "@/lib/pathways";

export default function SchoolDetail({
  school,
  pathway,
  showPathway,
  onTogglePathway,
  onSelect,
  onClose,
  expanded,
  onToggleExpand,
  isFavorite,
  onToggleFavorite,
}: {
  school: School;
  pathway: Pathway | null;
  showPathway: boolean;
  onTogglePathway: () => void;
  onSelect: (id: School["id"]) => void;
  onClose: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  // Touch gestures for the mobile bottom sheet:
  //   peek + swipe up      → expand
  //   expanded + swipe down → collapse to peek
  //   peek + swipe down     → dismiss
  // A near-zero move is treated as a tap (handled by the header onClick).
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ startY: 0, dy: 0, active: false, moved: false });

  function onHandleStart(e: React.TouchEvent) {
    if (!window.matchMedia("(max-width: 820px)").matches) return;
    drag.current = { startY: e.touches[0].clientY, dy: 0, active: true, moved: false };
    if (sheetRef.current) sheetRef.current.style.transition = "none";
  }
  function onHandleMove(e: React.TouchEvent) {
    const d = drag.current;
    if (!d.active) return;
    d.dy = e.touches[0].clientY - d.startY;
    if (Math.abs(d.dy) > 6) d.moved = true;
    // only follow the finger on downward drags (upward expansion is on release)
    if (sheetRef.current) {
      sheetRef.current.style.transform = d.dy > 0 ? `translateY(${d.dy}px)` : "";
    }
  }
  function onHandleEnd() {
    const d = drag.current;
    if (!d.active || !sheetRef.current) return;
    d.active = false;
    const el = sheetRef.current;
    el.style.transition = "transform 0.2s ease";
    el.style.transform = "";
    if (d.dy > 90) {
      if (expanded) onToggleExpand(); // collapse to peek
      else {
        el.style.transform = "translateY(100%)";
        window.setTimeout(onClose, 190); // dismiss
      }
    } else if (d.dy < -45 && !expanded) {
      onToggleExpand(); // swipe up → expand
    }
  }
  // Tap (no real drag) toggles expand/collapse.
  function onHeadClick() {
    if (drag.current.moved) return;
    onToggleExpand();
  }

  const areaLabel = areaForSchool(school);
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
    <div className={`detail ${expanded ? "expanded" : "peek"}`} ref={sheetRef}>
      <div
        className="detail-handle"
        onTouchStart={onHandleStart}
        onTouchMove={onHandleMove}
        onTouchEnd={onHandleEnd}
        aria-hidden="true"
      >
        <span className="detail-grabber" />
      </div>
      <button
        className={`fav-toggle ${isFavorite ? "on" : ""}`}
        onClick={onToggleFavorite}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        {isFavorite ? "★" : "☆"}
      </button>
      <button className="close" onClick={onClose} aria-label="Close">
        ×
      </button>

      {/* Header — tap or swipe up to expand, swipe down to collapse/dismiss */}
      <div
        className="detail-head"
        onClick={onHeadClick}
        onTouchStart={onHandleStart}
        onTouchMove={onHandleMove}
        onTouchEnd={onHandleEnd}
        role="button"
      >
        <span className="rating-badge peek-badge" style={{ background: ratingColor }}>
          {school.rating ?? "—"}
        </span>
        <div className="detail-head-text">
          <h2>{school.name}</h2>
          <p className="sub head-sub">
            {school.grades ? `Grades ${school.grades} · ` : ""}
            {levelLabel(school)} · {areaLabel}
          </p>
          <span className="peek-hint">Swipe up or tap for details ›</span>
        </div>
      </div>

      <div className="detail-body">
        <p className="sub">
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
      <span className="rel-level">{levelLabel(school)}</span>
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
