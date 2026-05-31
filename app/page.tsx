import { promises as fs } from "node:fs";
import path from "node:path";
import type { School } from "@/lib/types";
import Dashboard from "@/components/Dashboard";

// Read the scraped dataset at request time so newly-scraped schools appear
// without a rebuild.
async function loadSchools(): Promise<School[]> {
  const file = path.join(process.cwd(), "data", "schools.json");
  try {
    const raw = await fs.readFile(file, "utf8");
    const list = JSON.parse(raw) as School[];
    return list.filter((s) => s.lat != null && s.lng != null);
  } catch {
    return [];
  }
}

export const dynamic = "force-dynamic";

export default async function Page() {
  const schools = await loadSchools();
  return <Dashboard schools={schools} />;
}
