import type { Metadata, Viewport } from "next";
import { PlatformProvider } from "@/OS/lib/PlatformDetection";
import { ThemeProvider } from "@/OS/lib/ThemeProvider";
import { Web3Provider } from "./lib/Web3";
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
        <Web3Provider>
          <PlatformProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </PlatformProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
