import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PwaRuntime } from "@/components/sadn/PwaRuntime";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Root layout (round 16) — SEO-first metadata architecture: every page
 * sets its own unique title + description + canonical via the Metadata
 * API; this default only covers gaps. The site URL is pinned through
 * NEXT_PUBLIC_SITE_URL when provided so canonical/OG URLs are absolute.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SADN — Loose Abayas & Modest Fashion in Egypt | سدن",
    template: "%s",
  },
  description:
    "SADN (سدن) — loose, flowing abayas cut from honest, non-sheer fabrics. Small-batch atelier quality, cash on delivery / InstaPay / Vodafone Cash across Egypt.",
  keywords: ["SADN", "سدن", "abayas", "عبايات", "abaya Egypt", "modest fashion", "عبايات حريمي"],
  authors: [{ name: "SADN" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SADN",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/sadn-logo.svg",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "SADN — Loose Abayas & Modest Fashion in Egypt | سدن",
    description:
      "Loose, flowing abayas cut from honest fabrics. Cash on delivery across Egypt.",
    siteName: "SADN",
    type: "website",
    locale: "en_US",
    alternateLocale: "ar_EG",
  },
  twitter: {
    card: "summary_large_image",
    title: "SADN — Loose Abayas & Modest Fashion in Egypt | سدن",
    description: "Loose, flowing abayas cut from honest fabrics. Cash on delivery across Egypt.",
  },
};

export const viewport: Viewport = {
  themeColor: "#52314e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground bg-sadn-cream`}
      >
        <ThemeProvider>{children}</ThemeProvider>
        <PwaRuntime />
      </body>
    </html>
  );
}
