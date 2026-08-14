import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://corypahl.github.io/betting-tracker/"),
  title: "Market Map — FanDuel vs. Kalshi",
  description:
    "A weekly, state-by-state comparison of FanDuel Sportsbook and Kalshi sports-contract availability.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Market Map — FanDuel vs. Kalshi",
    description: "Two markets. One clear map.",
    type: "website",
    url: "https://corypahl.github.io/betting-tracker/",
    images: [
      {
        url: "/og.png",
        width: 1745,
        height: 909,
        alt: "Market Map — Two markets. One clear map.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Market Map — FanDuel vs. Kalshi",
    description: "Two markets. One clear map.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
