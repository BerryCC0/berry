"use client";

/**
 * Web3 Provider
 * Wraps the app with AppKit and Wagmi providers for multichain support.
 */

import { type ReactNode } from "react";
import { createAppKit } from "@reown/appkit/react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  wagmiConfig,
  adapters,
  allNetworks,
  metadata,
  projectId,
} from "./config";
import { mainnet } from "@reown/appkit/networks";

// Create a query client for React Query
const queryClient = new QueryClient();

// Initialize AppKit once -- guard against duplicate calls from module re-evaluation
let appKitInitialized = false;
if (projectId && !appKitInitialized) {
  createAppKit({
    adapters,
    networks: allNetworks,
    defaultNetwork: mainnet,
    metadata,
    projectId,
    themeMode: "light",
  });
  appKitInitialized = true;
}

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

