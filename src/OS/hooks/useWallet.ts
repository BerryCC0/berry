"use client";

/**
 * useWallet Hook
 * Provides wallet connection state and syncs with sessionStore.
 *
 * This hook bridges Reown AppKit with Berry OS's session management,
 * keeping the sessionStore in sync with the wallet connection state.
 * Delegates persistence operations to the Boot module for centralized control.
 */

import { useEffect, useCallback, useRef } from "react";
import { useAppKit, useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { useSessionStore } from "@/OS/store/sessionStore";
import { useSettingsStore } from "@/OS/store/settingsStore";
import { persistence } from "@/OS/lib/Persistence";
import { loadPersistedData, clearPersistedDataFlag } from "@/OS/lib/Boot";

/**
 * Get chain name from chain ID or CAIP-2 chain identifier
 */
function getChainName(chainId: number | string | undefined): string {
  if (!chainId) return "unknown";

  // Handle CAIP-2 format (e.g., "eip155:1", "solana:mainnet", "bip122:...")
  if (typeof chainId === "string") {
    if (chainId.startsWith("eip155:")) {
      const numericId = parseInt(chainId.split(":")[1], 10);
      return getChainNameFromId(numericId);
    }
    if (chainId.startsWith("solana:")) {
      return "solana";
    }
    if (chainId.startsWith("bip122:")) {
      return "bitcoin";
    }
    return chainId;
  }

  return getChainNameFromId(chainId);
}

/**
 * Get chain name from numeric chain ID
 */
function getChainNameFromId(chainId: number): string {
  const chains: Record<number, string> = {
    1: "ethereum",
    137: "polygon",
    8453: "base",
    10: "optimism",
    42161: "arbitrum",
  };
  return chains[chainId] || `evm-${chainId}`;
}

/**
 * Get numeric chain ID from various formats
 */
function getNumericChainId(chainId: number | string | undefined): number {
  if (!chainId) return 0;

  if (typeof chainId === "number") return chainId;

  // Handle CAIP-2 format
  if (chainId.startsWith("eip155:")) {
    return parseInt(chainId.split(":")[1], 10);
  }

  // Non-EVM chains get special IDs
  if (chainId.startsWith("solana:")) return -1; // Solana
  if (chainId.startsWith("bip122:")) return -2; // Bitcoin

  return 0;
}

export function useWallet() {
  const { open } = useAppKit();
  const { address, isConnected, caipAddress } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();

  const {
    primaryWallet,
    connectWallet,
    disconnectWallet: sessionDisconnect,
  } = useSessionStore();

  // Get privacy settings
  const privacySettings = useSettingsStore((state) => state.settings.privacy);

  // Track if we've already upgraded persistence to avoid duplicate calls
  const persistenceUpgradedRef = useRef(false);

  // Sync wallet state with session store and handle persistence
  useEffect(() => {
    if (isConnected && address) {
      const chain = getChainName(chainId);
      const numericChainId = getNumericChainId(chainId);

      // Only update if wallet changed
      if (
        !primaryWallet ||
        primaryWallet.address !== address ||
        primaryWallet.chain !== chain
      ) {
        connectWallet({
          address,
          chain,
          chainId: numericChainId,
        });

        if (process.env.NODE_ENV === "development") {
          console.log("[useWallet] Wallet connected:", {
            address: address.slice(0, 8) + "...",
            chain,
            chainId: numericChainId,
          });
        }

        // Load persisted data via centralized Boot module
        if (!persistenceUpgradedRef.current) {
          persistenceUpgradedRef.current = true;
          loadPersistedData({ address, chain, chainId: numericChainId }).catch(
            (error) => {
              console.error("[useWallet] Failed to load persisted data:", error);
              persistenceUpgradedRef.current = false;
            }
          );
        }
      }
    } else if (!isConnected && primaryWallet) {
      // Wallet disconnected
      sessionDisconnect(primaryWallet.address);

      // Check if user wants to clear data on disconnect
      if (privacySettings.clearDataOnDisconnect) {
        persistence.clearAllUserData().then(() => {
          localStorage.removeItem("berry-settings");
          localStorage.removeItem("berry-desktop");
          localStorage.removeItem("berry-dock");
          if (process.env.NODE_ENV === "development") {
            console.log("[useWallet] Cleared all user data on disconnect");
          }
        });
      }

      // Downgrade persistence to ephemeral and reset persisted data flag
      persistence.downgradeToEphemeral();
      clearPersistedDataFlag();
      persistenceUpgradedRef.current = false;

      if (process.env.NODE_ENV === "development") {
        console.log("[useWallet] Wallet disconnected, persistence downgraded");
      }
    }
  }, [
    isConnected,
    address,
    chainId,
    primaryWallet,
    connectWallet,
    sessionDisconnect,
    privacySettings.clearDataOnDisconnect,
  ]);

  // Open connect modal
  const connect = useCallback(() => {
    open();
  }, [open]);

  // Disconnect (opens modal with account view)
  const disconnect = useCallback(() => {
    open({ view: "Account" });
  }, [open]);

  // Open network selector
  const switchNetwork = useCallback(() => {
    open({ view: "Networks" });
  }, [open]);

  /**
   * Clear wallet session storage to prevent auto-reconnect.
   * Called when "Remember Wallet" is disabled.
   */
  const forgetWallet = useCallback(() => {
    // Clear wagmi/AppKit storage keys
    const keysToRemove = [
      "wagmi.store",
      "wagmi.connected",
      "wagmi.wallet",
      "wagmi.recentConnectorId",
      "@w3m/recent",
      "@w3m/connected_connector",
      "wc@2:core:0.3//keychain",
    ];
    
    keysToRemove.forEach((key) => {
      try {
        // Find and remove keys that start with these prefixes
        Object.keys(localStorage).forEach((storageKey) => {
          if (storageKey.startsWith(key) || storageKey.includes("walletconnect")) {
            localStorage.removeItem(storageKey);
          }
        });
      } catch (e) {
        // Ignore storage errors
      }
    });

    if (process.env.NODE_ENV === "development") {
      console.log("[useWallet] Cleared wallet session storage");
    }
  }, []);

  // Effect to clear wallet storage when "Remember Wallet" is turned off
  useEffect(() => {
    if (!privacySettings.rememberWallet && !isConnected) {
      // Don't auto-reconnect - clear stored session
      forgetWallet();
    }
  }, [privacySettings.rememberWallet, isConnected, forgetWallet]);

  return {
    // State
    isConnected,
    address,
    caipAddress,
    chainId,
    chainName: getChainName(chainId),
    profile: primaryWallet ? { primaryWallet } : null,

    // Actions
    connect,
    disconnect,
    switchNetwork,
    forgetWallet,
  };
}

