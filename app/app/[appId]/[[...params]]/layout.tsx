/**
 * App Route Layout
 * Generates metadata for SEO and social sharing
 */

import type { Metadata } from "next";
import { osAppConfigs } from "@/OS/Apps/OSAppConfig";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ appId: string; params?: string[] }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ appId: string }>;
}): Promise<Metadata> {
  const { appId } = await params;
  const app = osAppConfigs.find((a) => a.id === appId);

  if (!app) {
    return {
      title: "Berry OS",
      description: "A Mac OS 8 recreation for the web",
    };
  }

  return {
    title: `${app.name} - Berry OS`,
    description: `Open ${app.name} in Berry OS`,
    openGraph: {
      title: `${app.name} - Berry OS`,
      description: `Open ${app.name} in Berry OS`,
      images: ["/og/berry-os.png"],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${app.name} - Berry OS`,
      description: `Open ${app.name} in Berry OS`,
      images: ["/og/berry-os.png"],
    },
  };
}

export default async function AppRouteLayout({ children, params }: LayoutProps) {
  return <>{children}</>;
}

