import type { School } from "@/lib/types";
import schoolsData from "@/data/schools.json";
import Dashboard from "@/components/Dashboard";

// The dataset is committed to the repo and imported statically so it is always
// bundled into the deployment (Vercel functions have a read-only filesystem).
// To add schools in production: run the scraper locally and push — Vercel
// redeploys automatically.
// Only graded schools (those with a GreatSchools rating) and that have
// coordinates are shown.
const schools = (schoolsData as unknown as School[]).filter(
  (s) => s.lat != null && s.lng != null && s.rating != null,
);

export default function Page() {
  return <Dashboard schools={schools} />;
}
