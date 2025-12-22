/**
 * Session Store
 * Manages user session and wallet connection
 * 
 * Per ARCHITECTURE.md, emits session events for wallet and profile changes
 */

import { create } from "zustand";
import type { PlatformInfo } from "@/OS/types/platform";
import { systemBus } from "@/OS/lib/EventBus";

export interface WalletInfo {
  address: string;
  chain: string;
  chainId: number;
  isPrimary: boolean;
  linkedAt: number;
}

interface SessionStore {
  // State
  isInitialized: boolean;
  platform: PlatformInfo | null;

  // Wallet state
  primaryWallet: WalletInfo | null;
  linkedWallets: WalletInfo[];

  // Actions
  initialize: (platform: PlatformInfo) => void;
  connectWallet: (wallet: Omit<WalletInfo, "isPrimary" | "linkedAt">) => void;
  disconnectWallet: (address: string) => void;
  setPrimaryWallet: (address: string) => void;
  linkWallet: (wallet: Omit<WalletInfo, "isPrimary" | "linkedAt">) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  // Initial state
  isInitialized: false,
  platform: null,
  primaryWallet: null,
  linkedWallets: [],

  // Actions
  initialize: (platform: PlatformInfo) => {
    set({
      isInitialized: true,
      platform,
    });

    // Emit initialization event
    systemBus.emit("session:initialized", { platform: platform.type });
  },

  connectWallet: (wallet) => {
    const { primaryWallet } = get();
    const now = Date.now();

    const walletInfo: WalletInfo = {
      ...wallet,
      isPrimary: primaryWallet === null,
      linkedAt: now,
    };

    set((state) => {
      // If no primary wallet, this becomes primary
      if (!state.primaryWallet) {
        return {
          primaryWallet: walletInfo,
          linkedWallets: [walletInfo],
        };
      }

      // Otherwise just add to linked wallets
      return {
        linkedWallets: [...state.linkedWallets, walletInfo],
      };
    });

    // Emit wallet connected event
    systemBus.emit("session:wallet-connected", {
      address: wallet.address,
      chain: wallet.chain,
      chainId: wallet.chainId,
    });
  },

  disconnectWallet: (address: string) => {
    set((state) => {
      const newLinkedWallets = state.linkedWallets.filter(
        (w) => w.address !== address
      );

      // If disconnecting primary, set a new primary
      if (state.primaryWallet?.address === address) {
        const newPrimary = newLinkedWallets[0] ?? null;
        if (newPrimary) {
          newPrimary.isPrimary = true;
        }

        return {
          primaryWallet: newPrimary,
          linkedWallets: newLinkedWallets,
        };
      }

      return { linkedWallets: newLinkedWallets };
    });

    // Emit wallet disconnected event
    systemBus.emit("session:wallet-disconnected", { address });
  },

  setPrimaryWallet: (address: string) => {
    set((state) => {
      const wallet = state.linkedWallets.find((w) => w.address === address);
      if (!wallet) return state;

      const updatedWallets = state.linkedWallets.map((w) => ({
        ...w,
        isPrimary: w.address === address,
      }));

      return {
        primaryWallet: { ...wallet, isPrimary: true },
        linkedWallets: updatedWallets,
      };
    });
  },

  linkWallet: (wallet) => {
    const now = Date.now();

    const walletInfo: WalletInfo = {
      ...wallet,
      isPrimary: false,
      linkedAt: now,
    };

    set((state) => ({
      linkedWallets: [...state.linkedWallets, walletInfo],
    }));

    // Emit wallet connected event (linking is a form of connecting)
    systemBus.emit("session:wallet-connected", {
      address: wallet.address,
      chain: wallet.chain,
      chainId: wallet.chainId,
    });
  },

  reset: () => {
    const { primaryWallet } = get();

    set({
      isInitialized: false,
      platform: null,
      primaryWallet: null,
      linkedWallets: [],
    });

    // Emit disconnect for primary wallet if there was one
    if (primaryWallet) {
      systemBus.emit("session:wallet-disconnected", { address: primaryWallet.address });
    }
  },
}));
