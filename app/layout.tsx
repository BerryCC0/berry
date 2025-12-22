import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";

export const metadata: Metadata = {
  title: "Berry OS",
  description: "A Mac OS 8 recreation for the web",
  keywords: ["Berry OS", "Mac OS 8", "Nouns", "Web3", "Desktop"],
  authors: [{ name: "Berry OS" }],
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
