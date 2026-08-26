import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = { title: { default: "AMJ HomeOS", template: "%s · AMJ HomeOS" }, applicationName: "AMJ HomeOS", description: "Secure, private smart-home management by AMJ Consterior Solutions", manifest: "/manifest.webmanifest", appleWebApp: { capable: true, title: "AMJ HomeOS", statusBarStyle: "default" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#071a2b", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
