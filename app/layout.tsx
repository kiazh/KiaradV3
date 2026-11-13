import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Kiarad",
  description: "Kiarad: Math-Phys @ UWaterloo, ML research @ UofT. Projects, what I'm into, and how to reach me.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#1c2b4c", colorScheme: "dark light" };

// Runs before first paint, so a saved day theme never flashes night first.
const THEME = `try{if(localStorage.getItem("theme")==="day")document.documentElement.dataset.theme="day"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME }} /></head>
      <body>{children}</body>
    </html>
  );
}
