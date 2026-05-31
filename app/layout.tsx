import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SchoolScope — Silicon Valley Schools Map",
  description:
    "Interactive map of Silicon Valley & Peninsula public schools (San Jose, Palo Alto, Mountain View, Sunnyvale, Cupertino, Santa Clara, Saratoga, Redwood City) with toggleable rating, equity, staffing and demographic overlays, plus district feeder families. Data from GreatSchools.org.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
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
