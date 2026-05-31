# 🔭 SchoolScope

Interactive map of public schools across the **South Bay** — Sunnyvale, Cupertino / West
Valley, West San Jose, Cambrian, and Almaden — with toggleable data overlays scraped live
from [GreatSchools.org](https://www.greatschools.org). Built with Next.js + Leaflet.

Pick any metric to recolor **and resize** the school markers (a choropleth — bigger, brighter
= higher value):

- **Overview** — GreatSchools rating (1–10)
- **Equity & Income** — % low-income (economically disadvantaged), % English learners
- **Teachers & Staffing** — students per teacher, % certified teachers
- **Demographics** — % Asian / Hispanic / White / Two-or-more / Filipino / Black

Filter by **area** (Sunnyvale, Cupertino/West Valley, West San Jose, Cambrian, Almaden) and
by **school level** (elementary / middle / high). Click any school for a detail card: rating,
equity stats, a stacked demographic bar, its **named school district**, and its district
family grouped by level (elementary → middle → high) with a link to the official
attendance-zone map. Paste any `greatschools.org` URL in the sidebar to scrape and add a new
school on the fly.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

The map reads `data/schools.json`, which is already seeded with ~36 real schools.

## Scraping

The dashboard and CLI share one scraper (`scripts/scrape-school.mjs`). It parses the
`window.gon` data, embedded React payloads, and JSON-LD that GreatSchools ships in each
profile page — no headless browser required — then geocodes the address via OpenStreetMap
Nominatim (coordinates aren't on the page).

```bash
# Scrape one school and print the record (no save)
node scripts/scrape-school.mjs "https://www.greatschools.org/california/san-jose/5718-Oster-Elementary-School/" --print

# Scrape one school and save into data/schools.json
node scripts/scrape-school.mjs "https://www.greatschools.org/california/sunnyvale/5700-Bishop-Elementary-School/"

# Re-scrape / extend the seed set
node scripts/scrape-school.mjs --batch scripts/urls.txt
```

In the app, the **Add a School** form POSTs to `/api/scrape`, which calls the same module
and upserts the result — so "press a new school in the map" works end to end.

### Extracted fields

| Field | Source |
|---|---|
| name, id, path | `window.gon.school` |
| rating, district, city, zip, level, type | `window.gon.data_layer_hash` |
| demographics (% by race) | `window.gon.ethnicity` |
| % low-income, % English learners | `window.gon.subgroup` |
| gender split | `window.gon.gender` |
| students per teacher, % certified teachers | embedded React data blob |
| street address, phone | JSON-LD (`@type: School`) |
| lat / lng | OpenStreetMap Nominatim geocode |

## Stack

Next.js 14 (App Router) · React 18 · React-Leaflet · CARTO dark basemap. Zero API keys
required.

## Deploy (Vercel)

The home page is statically prerendered from the committed `data/schools.json`, so it hosts
on Vercel with zero config. Because Vercel functions have a **read-only filesystem**, the
live "Add a school" form and the `/api/scrape` route are **disabled in production** (they
work locally in `npm run dev`). To add schools to the live site:

```bash
node scripts/scrape-school.mjs "<greatschools-url>"   # writes data/schools.json
git commit -am "data: add <school>" && git push       # Vercel auto-redeploys
```

## Notes

Independent educational visualization. Data © their respective sources (California Dept. of
Education via GreatSchools.org, 2025). Not affiliated with or endorsed by GreatSchools.
Scrape responsibly and respect the source's terms.
