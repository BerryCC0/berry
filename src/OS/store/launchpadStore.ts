/**
 * Launchpad Store
 * Manages the open/close state of the Launchpad overlay
 */

import { create } from "zustand";

interface LaunchpadState {
  /** Whether Launchpad is currently open */
  isOpen: boolean;
}

interface LaunchpadActions {
  /** Open Launchpad */
  open: () => void;
  /** Close Launchpad */
  close: () => void;
  /** Toggle Launchpad open/closed */
  toggle: () => void;
}

export const useLaunchpadStore = create<LaunchpadState & LaunchpadActions>(
  (set) => ({
    isOpen: false,

    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  })
);

