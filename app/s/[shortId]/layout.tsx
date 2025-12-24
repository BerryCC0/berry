/**
 * Short Link Route Layout
 * Provides metadata for short links
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Berry OS - Shared Link",
  description: "Opening shared content in Berry OS",
  openGraph: {
    title: "Berry OS - Shared Link",
    description: "Opening shared content in Berry OS",
    images: ["/og/berry-os.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Berry OS - Shared Link",
    description: "Opening shared content in Berry OS",
    images: ["/og/berry-os.png"],
  },
};

export default function ShortLinkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

