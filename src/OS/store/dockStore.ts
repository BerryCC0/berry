/**
 * Dock Store
 * Manages dock state including pinned apps and dock preferences.
 * 
 * Pinned apps are user-customizable (except Finder which is always first).
 * When wallet is connected, preferences are loaded from user storage.
 * When not connected, defaults are used.
 */

import { create } from "zustand";
import { getIcon } from "@/OS/lib/IconRegistry";

/**
 * A pinned app in the dock
 */
export interface PinnedApp {
  appId: string;
  title: string;
  icon: string;
}

/**
 * Default pinned apps when no user preferences exist
 * Finder is always first and cannot be removed
 */
const DEFAULT_PINNED_APPS: PinnedApp[] = [
  { appId: "finder", title: "Finder", icon: getIcon("finder") },
  { appId: "nouns-auction", title: "Nouns Auction", icon: getIcon("nouns-auction") },
  { appId: "camp", title: "Camp", icon: getIcon("camp") },
  { appId: "calculator", title: "Calculator", icon: getIcon("calculator") },
  { appId: "settings", title: "Settings", icon: getIcon("settings") },
];

interface DockState {
  /** List of pinned apps (Finder is always first) */
  pinnedApps: PinnedApp[];
  /** Icon size in pixels */
  iconSize: number;
  /** Whether the dock has been initialized */
  isInitialized: boolean;
}

interface DockActions {
  /** Initialize dock with defaults or user preferences */
  initialize: (userPinnedApps?: PinnedApp[]) => void;
  
  /** Add an app to pinned apps */
  pinApp: (app: PinnedApp) => void;
  
  /** Remove an app from pinned apps (cannot remove Finder) */
  unpinApp: (appId: string) => void;
  
  /** Reorder pinned apps (Finder stays first) */
  reorderPinnedApps: (appIds: string[]) => void;
  
  /** Update an app's icon dynamically */
  updateAppIcon: (appId: string, icon: string) => void;
  
  /** Set icon size */
  setIconSize: (size: number) => void;
  
  /** Reset to defaults */
  reset: () => void;
}

// Icon size constraints
const MIN_ICON_SIZE = 32;
const MAX_ICON_SIZE = 72;
const DEFAULT_ICON_SIZE = 48;

const initialState: DockState = {
  pinnedApps: [],
  iconSize: DEFAULT_ICON_SIZE,
  isInitialized: false,
};

export const useDockStore = create<DockState & DockActions>((set, get) => ({
  ...initialState,

  initialize: (userPinnedApps?: PinnedApp[]) => {
    if (get().isInitialized) {
      return;
    }

    let pinnedApps: PinnedApp[];

    if (userPinnedApps && userPinnedApps.length > 0) {
      // User has preferences - ensure Finder is first
      const finderApp = userPinnedApps.find((app) => app.appId === "finder");
      const otherApps = userPinnedApps.filter((app) => app.appId !== "finder");
      
      pinnedApps = [
        finderApp || DEFAULT_PINNED_APPS[0], // Finder or default Finder
        ...otherApps,
      ];
    } else {
      // No user preferences - use defaults
      pinnedApps = [...DEFAULT_PINNED_APPS];
    }

    set({ pinnedApps, isInitialized: true });

    if (process.env.NODE_ENV === "development") {
      console.log("[DockStore] Initialized with", pinnedApps.length, "pinned apps");
    }
  },

  pinApp: (app: PinnedApp) => {
    const { pinnedApps } = get();
    
    // Don't add duplicates
    if (pinnedApps.some((p) => p.appId === app.appId)) {
      return;
    }

    set({ pinnedApps: [...pinnedApps, app] });
  },

  unpinApp: (appId: string) => {
    // Cannot unpin Finder
    if (appId === "finder") {
      console.warn("[DockStore] Cannot unpin Finder");
      return;
    }

    const { pinnedApps } = get();
    set({ pinnedApps: pinnedApps.filter((app) => app.appId !== appId) });
  },

  updateAppIcon: (appId: string, icon: string) => {
    const { pinnedApps } = get();
    const updatedApps = pinnedApps.map((app) =>
      app.appId === appId ? { ...app, icon } : app
    );
    set({ pinnedApps: updatedApps });
  },

  reorderPinnedApps: (appIds: string[]) => {
    const { pinnedApps } = get();
    
    // Ensure Finder stays first
    const finderApp = pinnedApps.find((app) => app.appId === "finder");
    if (!finderApp) return;

    // Reorder based on provided order, keeping Finder first
    const reordered: PinnedApp[] = [finderApp];
    
    appIds.forEach((appId) => {
      if (appId === "finder") return; // Skip Finder, already added
      const app = pinnedApps.find((p) => p.appId === appId);
      if (app) {
        reordered.push(app);
      }
    });

    set({ pinnedApps: reordered });
  },

  setIconSize: (size: number) => {
    const clampedSize = Math.min(MAX_ICON_SIZE, Math.max(MIN_ICON_SIZE, size));
    set({ iconSize: clampedSize });
  },

  reset: () => {
    set({
      pinnedApps: [...DEFAULT_PINNED_APPS],
      iconSize: DEFAULT_ICON_SIZE,
      isInitialized: true,
    });
  },
}));

// Export constants for use elsewhere
export { MIN_ICON_SIZE, MAX_ICON_SIZE, DEFAULT_ICON_SIZE };

