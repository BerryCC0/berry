/**
 * Exposé Store
 * Manages the Exposé (mission control) overlay state for tablet.
 *
 * Per HIG-SPEC-TABLET §9:
 * - Triggered by swipe up from dock or three-finger swipe up
 * - Shows all open windows in a grid
 * - Tap to focus, swipe up to close
 */

import { create } from "zustand";

interface ExposeStore {
  /** Whether Exposé is currently visible */
  isOpen: boolean;
  /** Open Exposé */
  open: () => void;
  /** Close Exposé (optionally focusing a window) */
  close: () => void;
  /** Toggle Exposé */
  toggle: () => void;
}

export const useExposeStore = create<ExposeStore>((set) => ({
  isOpen: false,

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
