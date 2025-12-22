/**
 * Web3 Configuration
 * Multichain AppKit setup for EVM, Solana, and Bitcoin
 */

import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { SolanaAdapter } from "@reown/appkit-adapter-solana";
import { BitcoinAdapter } from "@reown/appkit-adapter-bitcoin";
import {
  mainnet,
  polygon,
  base,
  optimism,
  arbitrum,
  solana,
  bitcoin,
} from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";

// Project ID from Reown Dashboard
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;

if (!projectId) {
  console.warn(
    "[Web3] Missing NEXT_PUBLIC_REOWN_PROJECT_ID - wallet connection will not work"
  );
}

// Metadata for wallet connections
export const metadata = {
  name: "Berry OS",
  description: "Mac OS 8 recreation for the Nouns ecosystem",
  url: typeof window !== "undefined" ? window.location.origin : "https://berryos.app",
  icons: ["/icons/berry.svg"],
};

// EVM Networks
export const evmNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
  mainnet,
  base,
];

// Solana Networks
export const solanaNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [solana];

// Bitcoin Networks
export const bitcoinNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [bitcoin];

// All networks combined
export const allNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
  ...evmNetworks,
  ...solanaNetworks,
  ...bitcoinNetworks,
];

// Create adapters
export const wagmiAdapter = new WagmiAdapter({
  networks: evmNetworks,
  projectId: projectId || "",
  ssr: true,
});

export const solanaAdapter = new SolanaAdapter();

export const bitcoinAdapter = new BitcoinAdapter({
  projectId: projectId || "",
});

// All adapters for AppKit
export const adapters = [wagmiAdapter, solanaAdapter, bitcoinAdapter];

// Wagmi config for WagmiProvider
export const wagmiConfig = wagmiAdapter.wagmiConfig;

// Export projectId for use in createAppKit
export { projectId };

