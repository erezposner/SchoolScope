#!/usr/bin/env node
// geocode-batch.mjs
// Bulk-fill missing lat/lng on data/schools.json using the U.S. Census Bureau
// batch geocoder (free, no key, built for thousands of addresses — unlike
// Nominatim which rate-limits). Leftover misses fall back to Nominatim.
//
// Usage: node scripts/geocode-batch.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, "..", "data", "schools.json");
const CENSUS = "https://geocoding.geo.census.gov/geocoder/locations/addressbatch";
const CHUNK = 2500; // census allows up to 10k; keep chunks modest

// minimal CSV line parser (handles quoted fields)
function parseCsvLine(line) {
  const out = [];
  let cur = "",
    inStr = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inStr) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') inStr = false;
      else cur += c;
    } else {
      if (c === '"') inStr = true;
      else if (c === ",") {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
  }
  out.push(cur);
  return out;
}

async function censusBatch(rows) {
  // rows: [{id, street, city, state, zip}]
  const csv = rows
    .map((r) => `${r.id},"${r.street}","${r.city}","${r.state}","${r.zip}"`)
    .join("\n");
  const form = new FormData();
  form.append("benchmark", "Public_AR_Current");
  form.append(
    "addressFile",
    new Blob([csv], { type: "text/csv" }),
    "addresses.csv",
  );
  const res = await fetch(CENSUS, { method: "POST", body: form });
  if (!res.ok) throw new Error(`census HTTP ${res.status}`);
  const text = await res.text();
  const coords = new Map(); // id -> {lat,lng}
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const f = parseCsvLine(line);
    // [id, input, "Match"/"No_Match", matchType, matchedAddr, "lon,lat", ...]
    const id = f[0];
    const status = f[2];
    if (status === "Match" && f[5] && f[5].includes(",")) {
      const [lon, lat] = f[5].split(",").map(Number);
      if (Number.isFinite(lat) && Number.isFinite(lon)) coords.set(id, { lat, lng: lon });
    }
  }
  return coords;
}

async function nominatim(q) {
  try {
    const res = await fetch(
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
        encodeURIComponent(q),
      { headers: { "User-Agent": "schoolscope/1.0 (bulk-fallback)" } },
    );
    const a = await res.json();
    if (a && a[0]) return { lat: +a[0].lat, lng: +a[0].lon };
  } catch {
    /* ignore */
  }
  return null;
}

async function main() {
  const schools = JSON.parse(readFileSync(DATA_FILE, "utf8"));
  const missing = schools.filter(
    (s) => s.lat == null && s.address?.street && s.address?.city,
  );
  console.log(`${missing.length} schools need coordinates.`);
  if (!missing.length) return;

  const byId = new Map(schools.map((s) => [String(s.id), s]));

  // 1) Census batch geocode in chunks
  let filled = 0;
  for (let i = 0; i < missing.length; i += CHUNK) {
    const chunk = missing.slice(i, i + CHUNK).map((s) => ({
      id: String(s.id),
      street: (s.address.street || "").replace(/"/g, ""),
      city: s.address.city || "",
      state: s.address.state || "CA",
      zip: s.address.zip || "",
    }));
    try {
      const coords = await censusBatch(chunk);
      for (const [id, c] of coords) {
        const s = byId.get(id);
        if (s) {
          s.lat = c.lat;
          s.lng = c.lng;
          filled++;
        }
      }
      console.log(`  census chunk ${i / CHUNK + 1}: matched ${coords.size}/${chunk.length}`);
    } catch (e) {
      console.warn(`  census chunk failed: ${e.message}`);
    }
    writeFileSync(DATA_FILE, JSON.stringify(schools, null, 2));
  }

  // 2) Nominatim fallback for the stragglers (throttled)
  const still = schools.filter((s) => s.lat == null && s.address?.full);
  console.log(`Census filled ${filled}. ${still.length} remain → Nominatim fallback.`);
  for (const s of still) {
    const c =
      (await nominatim(s.address.full)) ||
      (await nominatim(`${s.name}, ${s.address.city}, CA`));
    if (c) {
      s.lat = c.lat;
      s.lng = c.lng;
      filled++;
    }
    await new Promise((r) => setTimeout(r, 1100));
    writeFileSync(DATA_FILE, JSON.stringify(schools, null, 2));
  }

  const left = schools.filter((s) => s.lat == null).length;
  console.log(`Done. Filled ${filled}; ${left} still missing coordinates.`);
}

main();
