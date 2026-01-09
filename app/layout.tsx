import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
