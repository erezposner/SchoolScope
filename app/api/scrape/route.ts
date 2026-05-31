import { NextResponse } from "next/server";
// Reuse the exact same scraper the CLI uses.
import { scrapeSchool, upsertSchool } from "@/scripts/scrape-school.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
