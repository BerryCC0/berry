"use client";

/**
 * Client-side Providers
 * Wraps all providers that need to run on the client
 */

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { PlatformProvider } from "@/OS/lib/PlatformDetection";
import { ThemeProvider } from "@/OS/lib/ThemeProvider";

// Dynamically import Web3Provider to avoid SSR issues with Solana/Bitcoin adapters
const Web3Provider = dynamic(
  () => import("./lib/Web3").then((mod) => mod.Web3Provider),
  { ssr: false }
);

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <Web3Provider>
      <PlatformProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </PlatformProvider>
    </Web3Provider>
  );
}

