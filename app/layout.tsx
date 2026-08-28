import "./globals.css";
import "./enhancements.css";
import "./compact-mobile.css";
import "./ruvexa-themes.css";
import "./ruvexa-home.css";
import "./marketing.css";
import "./public-pages.css";
import type { Metadata, Viewport } from "next";
import { UiEnhancements } from "@/app/components/ui-enhancements";

export const metadata: Metadata = { title: { default: "AMJ HomeOS", template: "%s · AMJ HomeOS" }, applicationName: "AMJ HomeOS", description: "Secure, private smart-home management by AMJ Consterior Solutions", manifest: "/manifest.webmanifest", appleWebApp: { capable: true, title: "AMJ HomeOS", statusBarStyle: "default" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#071a2b" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<UiEnhancements /></body></html>;
}
