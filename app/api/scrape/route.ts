import { NextResponse } from "next/server";
// Reuse the exact same scraper the CLI uses.
import { scrapeSchool, upsertSchool } from "@/scripts/scrape-school.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // The scraper writes to the repo's data file, which only works on a writable
  // (local/dev) filesystem. The hosted build is read-only, so refuse there.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error:
          "Live scraping is disabled on the hosted site (read-only). Run the scraper locally (npm run scrape) and push to update the data.",
      },
      { status: 503 },
    );
  }

  let url: string;
  try {
    ({ url } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing 'url'" }, { status: 400 });
  }
  if (!/^https?:\/\/(www\.)?greatschools\.org\//i.test(url)) {
    return NextResponse.json(
      { error: "URL must be a greatschools.org school profile" },
      { status: 400 },
    );
  }

  try {
    const school = await scrapeSchool(url);
    const total = upsertSchool(school);
    return NextResponse.json({ school, total });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Scrape failed" },
      { status: 502 },
    );
  }
}
