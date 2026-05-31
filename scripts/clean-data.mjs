#!/usr/bin/env node
// clean-data.mjs
// Keep only schools that actually have GreatSchools data to visualize (a rating,
// income figure, or demographic breakdown) and that have coordinates. Drops the
// preschools / private tutoring centers / data-less listings the city sweep
// picks up. Run after scraping + geocode-batch.
//
// Usage: node scripts/clean-data.mjs [--dry]

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, "..", "data", "schools.json");
const dry = process.argv.includes("--dry");

// A school is shown only if GreatSchools assigns it a rating ("graded"). This
// filters out preschools, most private/religious schools, and data-less listings.
const hasData = (s) => s.metrics?.rating != null;

const schools = JSON.parse(readFileSync(DATA_FILE, "utf8"));

const keep = [];
const dropNoData = [];
const dropNoCoords = [];
for (const s of schools) {
  if (!hasData(s)) dropNoData.push(s);
  else if (s.lat == null || s.lng == null) dropNoCoords.push(s);
  else keep.push(s);
}

console.log(`Total scraped:      ${schools.length}`);
console.log(`Keep (data+coords): ${keep.length}`);
console.log(`Drop (no GS data):  ${dropNoData.length}`);
console.log(`Drop (no coords):   ${dropNoCoords.length}`);
if (dropNoCoords.length) {
  console.log(
    "  still un-geocoded:",
    dropNoCoords
      .slice(0, 20)
      .map((s) => s.name)
      .join(", "),
  );
}

if (!dry) {
  writeFileSync(DATA_FILE, JSON.stringify(keep, null, 2));
  console.log(`\nWrote ${keep.length} schools.`);
} else {
  console.log("\n(dry run — nothing written)");
}
