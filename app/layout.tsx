import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://gontop.app"),
  title: {
    default: "GONTOP — Buy UC, MLBB Diamonds & Game Top-Ups at Best Price",
    template: "%s | GONTOP",
  },
  description:
    "GONTOP is Bangladesh's most trusted game top-up platform. Buy PUBG UC, Mobile Legends Diamonds, Free Fire Diamonds and more at the cheapest price. Instant delivery with bKash, Nagad & Rocket.",
  keywords: [
    "buy UC bangladesh",
    "PUBG UC bd",
    "MLBB diamonds bangladesh",
    "mobile legends top up",
    "free fire diamonds bd",
    "game top up bangladesh",
    "cheap UC",
    "gontop",
    "top up bd",
    "bkash game top up",
  ],
  authors: [{ name: "GONTOP" }],
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  icons: { icon: "/logo-2.png" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "GONTOP",
    title: "GONTOP - Best Game Top-Up Store in Bangladesh",
    description:
      "GONTOP is Bangladesh's most trusted game top-up platform. Buy PUBG UC, Mobile Legends Diamonds, Free Fire Diamonds and more at the cheapest price.",
    images: [
      {
        url: "/og-image-new.png",
        width: 1200,
        height: 630,
        alt: "GONTOP - Best Game Top-Up Store in Bangladesh",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "GONTOP - Best Game Top-Up Store in Bangladesh",
    description:
      "Buy PUBG UC, Mobile Legends Diamonds, Free Fire Diamonds and more at the cheapest price.",
    images: ["/og-image-new.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ff6600",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
