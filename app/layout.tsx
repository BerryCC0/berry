import type { Metadata, Viewport } from "next";
import { Comic_Neue } from "next/font/google";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";

const comicNeue = Comic_Neue({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-comic-neue",
});

export const metadata: Metadata = {
  title: "Berry OS",
  description: "A Nounish OS",
  keywords: ["Berry OS", "Nouns", "Web3", "Desktop", "Mobile"],
  authors: [{ name: "Berry OS" }],
  icons: {
    icon: '/icons/berry.svg',
    shortcut: '/icons/berry.svg',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Berry OS',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // Default theme color - will be updated dynamically by applySettings
  themeColor: "#008080",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" translate="no" className={comicNeue.variable}>
      <head>
        <meta name="google" content="notranslate" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
