/**
 * Boot Store
 * Tracks OS boot state and system-level states like sleep mode.
 * 
 * This solves the timing issue where components render before the OS is fully
 * initialized. Components can subscribe to `isBooted` and show loading states
 * or wait for boot to complete.
 */

import { create } from "zustand";

/**
 * Boot Phases:
 * 1. isBooting: Core initialization (app registration, store setup)
 * 2. isWaitingForWallet: Waiting for AppKit to determine wallet state
 * 3. isLoadingData: Loading persisted data from database (if wallet connected)
 * 4. isReady: All loading complete, settings applied, UI can show
 */
interface BootState {
  /** Whether the OS has completed core boot */
  isBooted: boolean;
  /** Whether core boot is currently in progress */
  isBooting: boolean;
  /** Whether we're waiting for wallet SDK to initialize */
  isWaitingForWallet: boolean;
  /** Whether persisted data is being loaded */
  isLoadingData: boolean;
  /** Whether the OS is fully ready (all loading complete, settings applied) */
  isReady: boolean;
  /** Any error that occurred during boot */
  bootError: string | null;
  /** Whether the system is in sleep mode */
  isSleeping: boolean;
  /** Whether the system is shut down */
  isShutdown: boolean;
}

interface BootActions {
  /** Mark boot as starting */
  startBoot: () => void;
  /** Mark core boot as complete, start waiting for wallet */
  completeBoot: () => void;
  /** Mark wallet check as complete */
  walletCheckComplete: () => void;
  /** Mark data loading as starting */
  startLoadingData: () => void;
  /** Mark data loading as complete */
  finishLoadingData: () => void;
  /** Mark OS as fully ready */
  markReady: () => void;
  /** Set a boot error */
  setBootError: (error: string) => void;
  /** Put the system to sleep */
  sleep: () => void;
  /** Wake the system from sleep */
  wake: () => void;
  /** Restart the system (reload page) */
  restart: () => void;
  /** Shut down the system (close tab) */
  shutdown: () => void;
  /** Reset boot state (for testing) */
  reset: () => void;
}

const initialState: BootState = {
  isBooted: false,
  isBooting: false,
  isWaitingForWallet: false,
  isLoadingData: false,
  isReady: false,
  bootError: null,
  isSleeping: false,
  isShutdown: false,
};

export const useBootStore = create<BootState & BootActions>((set) => ({
  ...initialState,

  startBoot: () => {
    set({ isBooting: true, bootError: null });
  },

  completeBoot: () => {
    // Core boot done, now waiting for wallet SDK to tell us connection state
    set({ isBooted: true, isBooting: false, isWaitingForWallet: true });
  },

  walletCheckComplete: () => {
    set({ isWaitingForWallet: false });
  },

  startLoadingData: () => {
    set({ isLoadingData: true });
  },

  finishLoadingData: () => {
    set({ isLoadingData: false });
  },

  markReady: () => {
    set({ isReady: true });
  },

  setBootError: (error: string) => {
    set({ bootError: error, isBooting: false });
  },

  sleep: () => {
    set({ isSleeping: true });
  },

  wake: () => {
    set({ isSleeping: false });
  },

  restart: () => {
    // Navigate to root and reload
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  },

  shutdown: () => {
    // Show shutdown overlay first
    set({ isShutdown: true, isSleeping: false });
    
    // Attempt to close the tab after a brief delay
    // (only works if opened by script due to browser security)
    if (typeof window !== "undefined") {
      setTimeout(() => {
        window.close();
      }, 2000);
    }
  },

  reset: () => {
    set(initialState);
  },
}));

