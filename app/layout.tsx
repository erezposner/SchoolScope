import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SchoolScope — South Bay Schools Map",
  description:
    "Interactive map of South Bay (Sunnyvale, Cupertino, Cambrian, Almaden, West San Jose) public schools with toggleable rating, equity, staffing and demographic overlays, plus district feeder families. Data from GreatSchools.org.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
