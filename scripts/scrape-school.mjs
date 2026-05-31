#!/usr/bin/env node
// scrape-school.mjs
// Scrape a GreatSchools.org school profile into a normalized JSON record.
//
// Usage:
//   node scripts/scrape-school.mjs <greatschools-url> [--print]
//   node scripts/scrape-school.mjs --batch scripts/urls.txt
//
// GreatSchools renders the rich stats client-side but seeds them into the page
// as `window.gon.*` assignments, embedded React data blobs, and JSON-LD. We
// parse those directly (no headless browser needed) and geocode the street
// address via OpenStreetMap Nominatim (coordinates are not on the page).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, "..", "data", "schools.json");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// ---------------------------------------------------------------------------
// Low-level extraction helpers
// ---------------------------------------------------------------------------

// Brace/bracket-match a JSON literal starting at index `start` in `html`.
function matchLiteral(html, start) {
  const open = html[start];
  const close = open === "{" ? "}" : open === "[" ? "]" : null;
  if (!close) return null;
  let depth = 0,
    inStr = false,
    esc = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else {
      if (c === '"') inStr = true;
      else if (c === open) depth++;
      else if (c === close) {
        depth--;
        if (depth === 0) return html.slice(start, i + 1);
      }
    }
  }
  return null;
}

// Extract a `gon.<key>={...}` / `gon.<key>=[...]` assignment as parsed JSON.
function extractGon(html, key) {
  const marker = "gon." + key + "=";
  const at = html.indexOf(marker);
  if (at < 0) return null;
  const lit = matchLiteral(html, at + marker.length);
  if (!lit) return null;
  try {
    return JSON.parse(lit);
  } catch {
    return null;
  }
}

// Extract all `{"data":[ ... ]}` React component payloads.
function extractDataBlobs(html) {
  const blobs = [];
  let idx = 0;
  while ((idx = html.indexOf('{"data":[', idx)) >= 0) {
    const lit = matchLiteral(html, idx);
    if (lit) {
      try {
        blobs.push(JSON.parse(lit));
      } catch {
        /* ignore */
      }
      idx += lit.length;
    } else {
      idx += 8;
    }
  }
  return blobs;
}

// Pull the district name + slug from the breadcrumb JSON-LD (the crumb that
// links to a "…-school-district/" page).
function extractDistrict(html) {
  const re = /<script type="application\/ld\+json">(.*?)<\/script>/gs;
  let m;
  while ((m = re.exec(html))) {
    try {
      const o = JSON.parse(m[1]);
      if (o["@type"] !== "BreadcrumbList") continue;
      for (const it of o.itemListElement || []) {
        const id = it.item?.["@id"] || "";
        if (/-school-district\/?$/.test(id)) {
          return {
            name: it.item.name || null,
            slug: (id.match(/\/([^/]+)-school-district\/?$/) || [])[0] || null,
            url: id || null,
          };
        }
      }
    } catch {
      /* ignore */
    }
  }
  return { name: null, slug: null, url: null };
}

// Pull the School JSON-LD block.
function extractJsonLd(html) {
  const re = /<script type="application\/ld\+json">(.*?)<\/script>/gs;
  let m;
  while ((m = re.exec(html))) {
    try {
      const o = JSON.parse(m[1]);
      if (o["@type"] === "School") return o;
    } catch {
      /* ignore */
    }
  }
  return null;
}

const num = (v) => {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[%,]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const round1 = (v) => (v == null ? null : Math.round(v * 10) / 10);

// ---------------------------------------------------------------------------
// Nearby schools (the "by distance" list GreatSchools embeds — the same data
// Zillow surfaces as the schools serving an address). We use the nearest PUBLIC
// elementary / middle / high as the real feeder pathway instead of guessing.
// ---------------------------------------------------------------------------

function classifyGrades(grades) {
  // grades like "K-5", "6-8", "9-12", "PK-K", "7-8", "K-8"
  const startTok = grades.trim().split(/[-,–]/)[0].trim().toUpperCase();
  const start = startTok === "PK" || startTok === "K" ? 0 : parseInt(startTok, 10);
  const nums = (grades.match(/\d+/g) || []).map(Number);
  const end = nums.length ? Math.max(...nums) : start;
  if (!Number.isFinite(start)) return null;
  if (start >= 9) return "high";
  if (start >= 6 && end <= 8) return "middle";
  if (start <= 5) return "elementary";
  if (start >= 6) return "middle";
  return null;
}

function extractNearby(html) {
  const h = html.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'");
  // each entry: link":"/california/.../<id>-Name/"  ...>Name</a> ... distance ... <div>Type; grades</div>
  const re =
    /nearby school list item[^>]*?link":"(\/california\/[^"]+?)"[^>]*?>([^<]+)<\/a>\s*<div class="school-info">\s*<div class="school-distance">([\d.]+)\s*miles?<\/div>\s*<div>([^<]+)<\/div>/gs;
  const best = { elementary: null, middle: null, high: null };
  let m;
  const seen = new Set();
  while ((m = re.exec(h))) {
    const [, path, name, distStr, info] = m;
    if (seen.has(path)) continue;
    seen.add(path);
    const [type, grades = ""] = info.split(";").map((x) => x.trim());
    if (!/^Public/i.test(type)) continue; // public schools only (matches Zillow)
    const level = classifyGrades(grades);
    if (!level) continue;
    const idM = path.match(/\/(\d+)-/);
    const entry = {
      id: idM ? Number(idM[1]) : null,
      name: name.trim(),
      path,
      distanceMi: Number(distStr),
      type,
      grades,
    };
    // keep the nearest per level (rows are already roughly by distance, but be safe)
    if (!best[level] || entry.distanceMi < best[level].distanceMi) best[level] = entry;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Geocoding (Nominatim — coordinates aren't embedded in the page)
// ---------------------------------------------------------------------------

async function geocode(address) {
  if (!address) return null;
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
    encodeURIComponent(address);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "public-schools-dashboard/1.0 (scraper)" },
    });
    const arr = await res.json();
    if (arr && arr[0]) return { lat: +arr[0].lat, lng: +arr[0].lon };
  } catch (e) {
    console.warn("  geocode failed:", e.message);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main scrape
// ---------------------------------------------------------------------------

export async function scrapeSchool(url, { geocodeAddr = true } = {}) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const html = await res.text();

  const school = extractGon(html, "school") || {};
  const ethnicity = extractGon(html, "ethnicity") || [];
  const gender = extractGon(html, "gender") || {};
  const subgroup = extractGon(html, "subgroup") || {};
  const dlh = extractGon(html, "data_layer_hash") || {};
  const ld = extractJsonLd(html) || {};

  // Demographics: { Asian: 50.6, White: 23.6, ... }
  const demographics = {};
  for (const e of ethnicity) {
    if (e.breakdown != null) demographics[e.breakdown] = round1(num(e.school_value));
  }

  // Subgroups — economically disadvantaged == "low income"
  const sgVal = (k) => round1(num(subgroup[k]?.[0]?.school_value));
  const lowIncome = sgVal("Students who are economically disadvantaged");
  const englishLearners = sgVal("English learners");

  // Gender split
  const genderSplit = {
    male: round1(num(gender.Male?.[0]?.school_value)),
    female: round1(num(gender.Female?.[0]?.school_value)),
  };

  // Students per teacher + staffing from React data blobs
  let studentsPerTeacher = null;
  let pctCertifiedTeachers = null;
  for (const blob of extractDataBlobs(html)) {
    for (const d of blob.data || []) {
      const label = (d.label || "").toLowerCase();
      const val = num(d.value ?? d.score?.value);
      if (label.includes("students per teacher")) studentsPerTeacher = round1(val);
      else if (label.includes("certified")) pctCertifiedTeachers = round1(val);
    }
  }

  // Address & coordinates
  const addr = ld.address || {};
  const fullAddress = [
    addr.streetAddress,
    addr.addressLocality,
    addr.addressRegion,
    addr.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
  const coords = geocodeAddr ? await geocode(fullAddress) : null;

  const rating = num(dlh.gs_rating);
  const nearby = extractNearby(html);
  const districtInfo = extractDistrict(html);

  return {
    id: school.id ?? dlh.school_id ?? url,
    name: school.name || ld.name || "Unknown School",
    url,
    path: school.path || null,
    rating,
    level: dlh.level || null, // e / m / h
    type: dlh.type || null,
    grades: (ld.description?.match(/grades?\s+([\w-]+)/i) || [])[1] || null,
    district: dlh.district_id || null,
    districtName: districtInfo.name,
    districtUrl: districtInfo.url,
    address: {
      street: addr.streetAddress || null,
      city: addr.addressLocality || dlh.City || null,
      state: addr.addressRegion || dlh.State || "CA",
      zip: addr.postalCode || dlh.zipcode || null,
      full: fullAddress || null,
    },
    phone: ld.telephone || null,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    metrics: {
      rating,
      lowIncome,
      englishLearners,
      studentsPerTeacher,
      pctCertifiedTeachers,
    },
    demographics,
    gender: genderSplit,
    // Nearest public elementary/middle/high by distance, straight from
    // GreatSchools' own "Nearby Schools" list (the data Zillow shows).
    nearby,
    scrapedAt: SCRAPE_TS,
  };
}

// Timestamp is injected from outside the pure-extraction code path so the
// module stays deterministic when imported (Date is read here, at call time).
const SCRAPE_TS = new Date().toISOString();

// Merge a scraped record into data/schools.json (dedup by id).
export function upsertSchool(record) {
  let list = [];
  if (existsSync(DATA_FILE)) {
    try {
      list = JSON.parse(readFileSync(DATA_FILE, "utf8"));
    } catch {
      list = [];
    }
  }
  const i = list.findIndex((s) => String(s.id) === String(record.id));
  if (i >= 0) {
    // Preserve previously-resolved coordinates if this scrape's geocode failed,
    // so a transient Nominatim miss never drops a school off the map.
    if (record.lat == null && list[i].lat != null) {
      record.lat = list[i].lat;
      record.lng = list[i].lng;
    }
    list[i] = record;
  } else {
    list.push(record);
  }
  writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
  return list.length;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error(
      "Usage: node scripts/scrape-school.mjs <url> [--print]\n" +
        "       node scripts/scrape-school.mjs --batch scripts/urls.txt",
    );
    process.exit(1);
  }

  let urls = [];
  let printOnly = false;
  if (args[0] === "--batch") {
    urls = readFileSync(args[1], "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
  } else {
    urls = [args[0]];
    printOnly = args.includes("--print");
  }

  for (const url of urls) {
    try {
      console.log("Scraping:", url);
      const rec = await scrapeSchool(url);
      console.log(
        `  ✓ ${rec.name} | rating ${rec.metrics.rating} | low-income ${rec.metrics.lowIncome}% | s/t ${rec.metrics.studentsPerTeacher} | ${rec.lat},${rec.lng}`,
      );
      if (printOnly) {
        console.log(JSON.stringify(rec, null, 2));
      } else {
        const n = upsertSchool(rec);
        console.log(`  saved (${n} schools total)`);
      }
      // Be polite to Nominatim (1 req/sec) and GreatSchools.
      if (urls.length > 1) await new Promise((r) => setTimeout(r, 1200));
    } catch (e) {
      console.error("  ✗ failed:", e.message);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
