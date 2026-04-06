/**
 * Stage Store
 * Manages the Stage Strip state for tablet platform (iPadOS Stage Manager).
 *
 * Per HIG-SPEC-TABLET §3:
 * - Tracks up to 5 recent/background apps in the strip
 * - Ordered MRU-first (most recently used at top)
 * - Auto-hides when window dragged near left edge
 * - Reappears on left-edge swipe or after 1s idle
 */

import { create } from "zustand";

interface StagedApp {
  appId: string;
  windowId: string;
  title: string;
  icon: string;
}

interface StageStore {
  /** Apps in the Stage Strip, ordered MRU-first */
  stagedApps: StagedApp[];
  /** Whether the strip is currently visible */
  isStripVisible: boolean;
  /** Maximum slots in the strip */
  maxSlots: number;

  /** Move a window to the Stage Strip (background it) */
  stageApp: (app: StagedApp) => void;
  /** Bring an app from the strip to the workspace */
  unstageApp: (windowId: string) => StagedApp | undefined;
  /** Update MRU order — move app to front if already staged */
  touchApp: (windowId: string) => void;
  /** Remove an app from the strip entirely (e.g., when closed) */
  removeApp: (windowId: string) => void;
  /** Show/hide the strip */
  setStripVisible: (visible: boolean) => void;
}

export const useStageStore = create<StageStore>((set, get) => ({
  stagedApps: [],
  isStripVisible: true,
  maxSlots: 5,

  stageApp: (app) => {
    set((state) => {
      // Remove if already staged (re-stage at front)
      const filtered = state.stagedApps.filter((a) => a.windowId !== app.windowId);
      const updated = [app, ...filtered].slice(0, state.maxSlots);
      return { stagedApps: updated };
    });
  },

  unstageApp: (windowId) => {
    const state = get();
    const app = state.stagedApps.find((a) => a.windowId === windowId);
    if (app) {
      set({ stagedApps: state.stagedApps.filter((a) => a.windowId !== windowId) });
    }
    return app;
  },

  touchApp: (windowId) => {
    set((state) => {
      const index = state.stagedApps.findIndex((a) => a.windowId === windowId);
      if (index <= 0) return state; // Already at front or not found
      const app = state.stagedApps[index];
      const filtered = state.stagedApps.filter((_, i) => i !== index);
      return { stagedApps: [app, ...filtered] };
    });
  },

  removeApp: (windowId) => {
    set((state) => ({
      stagedApps: state.stagedApps.filter((a) => a.windowId !== windowId),
    }));
  },

  setStripVisible: (visible) => set({ isStripVisible: visible }),
}));
