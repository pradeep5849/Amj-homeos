import "./globals.css";

export const metadata = { title: "AMJ HomeOS", description: "Secure home management" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
