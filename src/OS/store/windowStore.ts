/**
 * Window Store
 * Manages all window state and operations
 * 
 * Per ARCHITECTURE.md and WINDOW_MANAGEMENT.md, this store emits system events
 * for all window operations so other systems can react (dock, persistence, etc.)
 */

import { create } from "zustand";
import type { WindowState, WindowConfig } from "@/OS/types/window";
import {
  generateWindowId,
  generateInstanceId,
  DEFAULT_WINDOW_CONSTRAINTS,
} from "@/OS/types/window";
import { systemBus } from "@/OS/lib/EventBus";

/**
 * Window limits per PERFORMANCE.md
 * Prevents memory issues from too many open windows
 */
const WINDOW_LIMITS = {
  desktop: {
    max: 50,
    warnAt: 40,
  },
  tablet: {
    max: 4,
    warnAt: 3,
  },
  mobile: {
    max: 10,
    warnAt: 8,
  },
};

/**
 * Detect device type for window constraints (basic viewport check).
 * More detailed detection lives in PlatformDetection.
 */
function getDeviceType(): "desktop" | "tablet" | "mobile" {
  if (typeof window === 'undefined') return "desktop";
  const platform = document.documentElement.dataset.platform;
  if (platform === "tablet") return "tablet";
  if (platform === "mobile" || platform === "farcaster") return "mobile";
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
}

/** @deprecated Use getDeviceType() instead */
function isMobileDevice(): boolean {
  return getDeviceType() === "mobile";
}

/** Snap zone identifiers for window tiling */
export type SnapZone = "left" | "right" | "maximize" | null;

interface WindowStore {
  // State
  windows: Map<string, WindowState>;
  focusedWindowId: string | null;
  nextZIndex: number;
  /** Active snap preview zone (shown as overlay while dragging near edge) */
  snapPreview: SnapZone;

  // Actions
  setSnapPreview: (zone: SnapZone) => void;
  snapWindow: (windowId: string, zone: "left" | "right" | "maximize") => void;
  createWindow: (appId: string, config: WindowConfig) => string;
  closeWindow: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  blurAllWindows: () => void;
  minimizeWindow: (windowId: string) => void;
  maximizeWindow: (windowId: string) => void;
  restoreWindow: (windowId: string) => void;
  moveWindow: (windowId: string, x: number, y: number) => void;
  resizeWindow: (windowId: string, width: number, height: number) => void;
  updateWindowTitle: (windowId: string, title: string) => void;
  updateAppState: (windowId: string, state: unknown) => void;
  batchUpdate: (updates: Array<{ windowId: string; x?: number; y?: number; width?: number; height?: number }>) => void;

  // Queries
  getWindow: (windowId: string) => WindowState | undefined;
  getWindowsByApp: (appId: string) => WindowState[];
  getTopWindow: () => WindowState | undefined;
  getAllWindows: () => WindowState[];
  getWindowIds: () => string[];
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  // Initial state
  windows: new Map(),
  focusedWindowId: null,
  nextZIndex: 100,
  snapPreview: null,

  // Snap actions
  setSnapPreview: (zone) => set({ snapPreview: zone }),

  snapWindow: (windowId, zone) => {
    const menuBarHeight = typeof document !== "undefined"
      ? parseInt(getComputedStyle(document.documentElement).getPropertyValue("--berry-menubar-height") || "28", 10)
      : 28;
    const dockHeight = 70;
    const vw = typeof globalThis.window !== "undefined" ? globalThis.window.innerWidth : 1200;
    const vh = typeof globalThis.window !== "undefined" ? globalThis.window.innerHeight : 800;
    const usableHeight = vh - menuBarHeight - dockHeight;

    let x = 0, y = menuBarHeight, w = vw, h = usableHeight;

    if (zone === "left") {
      w = Math.floor(vw / 2);
    } else if (zone === "right") {
      x = Math.floor(vw / 2);
      w = Math.floor(vw / 2);
    }
    // zone === "maximize" uses full width/height defaults above

    set((state) => {
      const win = state.windows.get(windowId);
      if (!win) return state;
      const newWindows = new Map(state.windows);
      newWindows.set(windowId, {
        ...win,
        x, y,
        width: w,
        height: h,
        isMaximized: zone === "maximize",
      });
      return { windows: newWindows, snapPreview: null };
    });
  },

  // Actions
  createWindow: (appId: string, config: WindowConfig) => {
    const { nextZIndex, focusedWindowId: previousFocusedId, windows } = get();
    
    // Check window limits per PERFORMANCE.md / HIG-SPEC-TABLET §6
    const deviceType = getDeviceType();
    const limits = WINDOW_LIMITS[deviceType];
    const currentCount = windows.size;
    
    if (currentCount >= limits.max) {
      console.warn(`[WindowStore] Maximum windows reached (${limits.max}). Cannot create new window.`);
      systemBus.emit("window:limit-reached", { currentCount, limit: limits.max });
      return ""; // Return empty string to indicate failure
    }
    
    if (currentCount >= limits.warnAt) {
      console.warn(`[WindowStore] ${currentCount} windows open, approaching limit of ${limits.max}`);
    }
    
    const windowId = generateWindowId();
    const instanceId = generateInstanceId(appId);

    // Cascade positioning: offset 22px from last window when no explicit position
    const CASCADE_OFFSET = 22;
    let initialX = config.x ?? undefined;
    let initialY = config.y ?? undefined;

    if (initialX === undefined || initialY === undefined) {
      // Find the most recently created window to cascade from
      const existingWindows = Array.from(windows.values());
      const lastWindow = existingWindows.length > 0
        ? existingWindows.reduce((a, b) => (a.zIndex > b.zIndex ? a : b))
        : null;

      if (lastWindow && !lastWindow.isMinimized) {
        initialX = initialX ?? lastWindow.x + CASCADE_OFFSET;
        initialY = initialY ?? lastWindow.y + CASCADE_OFFSET;
      } else {
        initialX = initialX ?? 100;
        initialY = initialY ?? 100;
      }
    }

    // Enforce menu bar floor on initial position
    if (typeof document !== "undefined") {
      const menuBarHeight = parseInt(
        getComputedStyle(document.documentElement)
          .getPropertyValue("--berry-menubar-height") || "28",
        10
      );
      initialY = Math.max(menuBarHeight, initialY);

      // Wrap cascade back if it goes off-screen
      const maxX = globalThis.innerWidth - (config.width ?? 400);
      const maxY = globalThis.innerHeight - 100;
      if (initialX > maxX || initialY > maxY) {
        initialX = 100;
        initialY = menuBarHeight + CASCADE_OFFSET;
      }
    }

    // Tablet-specific defaults: 70% viewport, min 320×460 (HIG-SPEC-TABLET §6)
    const isTabletDevice = deviceType === "tablet";
    const vw = typeof globalThis.window !== "undefined" ? globalThis.window.innerWidth : 1024;
    const vh = typeof globalThis.window !== "undefined" ? globalThis.window.innerHeight : 768;

    const defaultWidth = isTabletDevice
      ? config.width ?? Math.floor(vw * 0.7)
      : config.width;
    const defaultHeight = isTabletDevice
      ? config.height ?? Math.floor(vh * 0.7)
      : config.height;
    const tabletMinWidth = isTabletDevice ? 320 : DEFAULT_WINDOW_CONSTRAINTS.minWidth;
    const tabletMinHeight = isTabletDevice ? 460 : DEFAULT_WINDOW_CONSTRAINTS.minHeight;

    // Center tablet windows if no explicit position
    if (isTabletDevice && initialX === undefined) {
      const stageStripWidth = 80;
      initialX = stageStripWidth + Math.floor((vw - stageStripWidth - defaultWidth) / 2);
    }
    if (isTabletDevice && initialY === undefined) {
      initialY = Math.floor((vh - 56 - defaultHeight) / 2); // 56 = dock height
    }

    const windowState: WindowState = {
      id: windowId,
      appId,
      instanceId,
      title: config.title,
      icon: config.icon,

      // Position - cascaded from last window, clamped below menu bar
      x: initialX,
      y: initialY,
      width: defaultWidth,
      height: defaultHeight,

      // Constraints
      minWidth: config.minWidth ?? tabletMinWidth,
      minHeight: config.minHeight ?? tabletMinHeight,
      maxWidth: config.maxWidth,
      maxHeight: config.maxHeight,
      isResizable: config.isResizable ?? true,

      // State
      isFocused: true,
      isMinimized: false,
      isMaximized: false,
      zIndex: nextZIndex,

      // App state
      appState: config.initialState,
    };

    set((state) => {
      const newWindows = new Map(state.windows);
      newWindows.set(windowId, windowState);

      // Blur previous focused window
      if (state.focusedWindowId) {
        const prevWindow = newWindows.get(state.focusedWindowId);
        if (prevWindow) {
          newWindows.set(state.focusedWindowId, {
            ...prevWindow,
            isFocused: false,
          });
        }
      }

      return {
        windows: newWindows,
        focusedWindowId: windowId,
        nextZIndex: nextZIndex + 1,
      };
    });

    // Emit events after state update
    systemBus.emit("window:created", { windowId, appId });
    
    // If there was a previous focused window, emit blur for it
    if (previousFocusedId) {
      systemBus.emit("window:blurred", { windowId: previousFocusedId });
    }
    
    // Emit focus for new window
    systemBus.emit("window:focused", { windowId, previousId: previousFocusedId });

    return windowId;
  },

  closeWindow: (windowId: string) => {
    const window = get().windows.get(windowId);
    if (!window) return;

    const appId = window.appId;

    set((state) => {
      const newWindows = new Map(state.windows);
      newWindows.delete(windowId);

      // Find new focused window (highest z-index)
      let newFocusedId: string | null = null;
      let highestZ = -1;

      newWindows.forEach((win) => {
        if (!win.isMinimized && win.zIndex > highestZ) {
          highestZ = win.zIndex;
          newFocusedId = win.id;
        }
      });

      // Focus the new window if found
      if (newFocusedId) {
        const focusedWindow = newWindows.get(newFocusedId);
        if (focusedWindow) {
          newWindows.set(newFocusedId, { ...focusedWindow, isFocused: true });
        }
      }

      return {
        windows: newWindows,
        focusedWindowId: newFocusedId,
      };
    });

    // Emit close event
    systemBus.emit("window:closed", { windowId, appId });

    // If a new window was focused, emit focus event
    const newFocusedId = get().focusedWindowId;
    if (newFocusedId) {
      systemBus.emit("window:focused", { windowId: newFocusedId, previousId: windowId });
    }
  },

  focusWindow: (windowId: string) => {
    const { focusedWindowId: previousFocusedId, nextZIndex } = get();

    if (previousFocusedId === windowId) return;

    set((state) => {
      const newWindows = new Map(state.windows);

      // Blur previous focused window
      if (state.focusedWindowId) {
        const prevWindow = newWindows.get(state.focusedWindowId);
        if (prevWindow) {
          newWindows.set(state.focusedWindowId, {
            ...prevWindow,
            isFocused: false,
          });
        }
      }

      // Focus new window
      const targetWindow = newWindows.get(windowId);
      if (targetWindow) {
        newWindows.set(windowId, {
          ...targetWindow,
          isFocused: true,
          isMinimized: false,
          zIndex: nextZIndex,
        });
      }

      return {
        windows: newWindows,
        focusedWindowId: windowId,
        nextZIndex: nextZIndex + 1,
      };
    });

    // Emit events
    if (previousFocusedId) {
      systemBus.emit("window:blurred", { windowId: previousFocusedId });
    }
    systemBus.emit("window:focused", { windowId, previousId: previousFocusedId });
  },

  blurAllWindows: () => {
    const { focusedWindowId: previousFocusedId } = get();

    set((state) => {
      const newWindows = new Map(state.windows);

      newWindows.forEach((win, id) => {
        if (win.isFocused) {
          newWindows.set(id, { ...win, isFocused: false });
        }
      });

      return {
        windows: newWindows,
        focusedWindowId: null,
      };
    });

    // Emit blur event for the previously focused window
    if (previousFocusedId) {
      systemBus.emit("window:blurred", { windowId: previousFocusedId });
    }
  },

  minimizeWindow: (windowId: string) => {
    const { focusedWindowId: previousFocusedId } = get();

    set((state) => {
      const newWindows = new Map(state.windows);
      const targetWindow = newWindows.get(windowId);

      if (targetWindow) {
        newWindows.set(windowId, {
          ...targetWindow,
          isMinimized: true,
          isFocused: false,
        });
      }

      // Find new focused window
      let newFocusedId: string | null = null;
      let highestZ = -1;

      newWindows.forEach((win) => {
        if (!win.isMinimized && win.zIndex > highestZ) {
          highestZ = win.zIndex;
          newFocusedId = win.id;
        }
      });

      if (newFocusedId) {
        const focusedWindow = newWindows.get(newFocusedId);
        if (focusedWindow) {
          newWindows.set(newFocusedId, { ...focusedWindow, isFocused: true });
        }
      }

      return {
        windows: newWindows,
        focusedWindowId: newFocusedId,
      };
    });

    // Emit events
    systemBus.emit("window:minimized", { windowId });
    
    if (previousFocusedId === windowId) {
      systemBus.emit("window:blurred", { windowId });
    }

    const newFocusedId = get().focusedWindowId;
    if (newFocusedId && newFocusedId !== previousFocusedId) {
      systemBus.emit("window:focused", { windowId: newFocusedId, previousId: windowId });
    }
  },

  maximizeWindow: (windowId: string) => {
    set((state) => {
      const newWindows = new Map(state.windows);
      const targetWindow = newWindows.get(windowId);

      if (targetWindow) {
        newWindows.set(windowId, {
          ...targetWindow,
          isMaximized: true,
        });
      }

      return { windows: newWindows };
    });

    // Emit event
    systemBus.emit("window:maximized", { windowId });
  },

  restoreWindow: (windowId: string) => {
    const { nextZIndex, focusedWindowId: previousFocusedId } = get();

    set((state) => {
      const newWindows = new Map(state.windows);

      // Blur previous focused window
      if (state.focusedWindowId && state.focusedWindowId !== windowId) {
        const prevWindow = newWindows.get(state.focusedWindowId);
        if (prevWindow) {
          newWindows.set(state.focusedWindowId, {
            ...prevWindow,
            isFocused: false,
          });
        }
      }

      const targetWindow = newWindows.get(windowId);
      if (targetWindow) {
        newWindows.set(windowId, {
          ...targetWindow,
          isMinimized: false,
          isMaximized: false,
          isFocused: true,
          zIndex: nextZIndex,
        });
      }

      return {
        windows: newWindows,
        focusedWindowId: windowId,
        nextZIndex: nextZIndex + 1,
      };
    });

    // Emit events
    systemBus.emit("window:restored", { windowId });
    
    if (previousFocusedId && previousFocusedId !== windowId) {
      systemBus.emit("window:blurred", { windowId: previousFocusedId });
    }
    
    systemBus.emit("window:focused", { windowId, previousId: previousFocusedId });
  },

  moveWindow: (windowId: string, x: number, y: number) => {
    // Enforce menu bar floor: window top edge must never go above menu bar bottom.
    // Read the live CSS variable so this stays correct across theme/era changes.
    let clampedY = y;
    if (typeof document !== "undefined") {
      const menuBarHeight = parseInt(
        getComputedStyle(document.documentElement)
          .getPropertyValue("--berry-menubar-height") || "28",
        10
      );
      clampedY = Math.max(menuBarHeight, y);
    }

    set((state) => {
      const newWindows = new Map(state.windows);
      const targetWindow = newWindows.get(windowId);

      if (targetWindow) {
        newWindows.set(windowId, { ...targetWindow, x, y: clampedY });
      }

      return { windows: newWindows };
    });

    // Emit event
    systemBus.emit("window:moved", { windowId, x, y: clampedY });
  },

  resizeWindow: (windowId: string, width: number, height: number) => {
    let finalWidth = width;
    let finalHeight = height;

    set((state) => {
      const newWindows = new Map(state.windows);
      const targetWindow = newWindows.get(windowId);

      if (targetWindow) {
        // Enforce constraints
        finalWidth = Math.max(
          targetWindow.minWidth,
          Math.min(width, targetWindow.maxWidth ?? Infinity)
        );
        finalHeight = Math.max(
          targetWindow.minHeight,
          Math.min(height, targetWindow.maxHeight ?? Infinity)
        );

        newWindows.set(windowId, {
          ...targetWindow,
          width: finalWidth,
          height: finalHeight,
        });
      }

      return { windows: newWindows };
    });

    // Emit event with constrained values
    systemBus.emit("window:resized", { windowId, width: finalWidth, height: finalHeight });
  },

  updateWindowTitle: (windowId: string, title: string) => {
    set((state) => {
      const newWindows = new Map(state.windows);
      const targetWindow = newWindows.get(windowId);

      if (targetWindow) {
        newWindows.set(windowId, { ...targetWindow, title });
      }

      return { windows: newWindows };
    });
  },

  updateAppState: (windowId: string, appState: unknown) => {
    set((state) => {
      const newWindows = new Map(state.windows);
      const targetWindow = newWindows.get(windowId);

      if (targetWindow) {
        newWindows.set(windowId, { ...targetWindow, appState });
      }

      return { windows: newWindows };
    });
  },

  batchUpdate: (updates: Array<{ windowId: string; x?: number; y?: number; width?: number; height?: number }>) => {
    // Read menu bar height once for the whole batch
    let menuBarHeight = 28;
    if (typeof document !== "undefined") {
      menuBarHeight = parseInt(
        getComputedStyle(document.documentElement)
          .getPropertyValue("--berry-menubar-height") || "28",
        10
      );
    }

    set((state) => {
      const newWindows = new Map(state.windows);

      updates.forEach(({ windowId, x, y, width, height }) => {
        const targetWindow = newWindows.get(windowId);
        if (!targetWindow) return;

        let updatedWindow = targetWindow;

        // Apply position updates if provided, enforcing menu bar floor
        if (x !== undefined || y !== undefined) {
          const clampedY = y !== undefined ? Math.max(menuBarHeight, y) : updatedWindow.y;
          updatedWindow = {
            ...updatedWindow,
            x: x !== undefined ? x : updatedWindow.x,
            y: clampedY,
          };
        }

        // Apply size updates with constraint enforcement if provided
        if (width !== undefined || height !== undefined) {
          const finalWidth = width !== undefined
            ? Math.max(
                updatedWindow.minWidth,
                Math.min(width, updatedWindow.maxWidth ?? Infinity)
              )
            : updatedWindow.width;
          const finalHeight = height !== undefined
            ? Math.max(
                updatedWindow.minHeight,
                Math.min(height, updatedWindow.maxHeight ?? Infinity)
              )
            : updatedWindow.height;

          updatedWindow = {
            ...updatedWindow,
            width: finalWidth,
            height: finalHeight,
          };
        }

        newWindows.set(windowId, updatedWindow);
      });

      return { windows: newWindows };
    });
  },

  // Queries
  getWindow: (windowId: string) => {
    return get().windows.get(windowId);
  },

  getWindowsByApp: (appId: string) => {
    const windows: WindowState[] = [];
    get().windows.forEach((win) => {
      if (win.appId === appId) {
        windows.push(win);
      }
    });
    return windows;
  },

  getTopWindow: () => {
    const { windows } = get();
    let topWindow: WindowState | undefined;
    let highestZ = -1;

    windows.forEach((win) => {
      if (!win.isMinimized && win.zIndex > highestZ) {
        highestZ = win.zIndex;
        topWindow = win;
      }
    });

    return topWindow;
  },

  getAllWindows: () => {
    return Array.from(get().windows.values());
  },

  getWindowIds: () => {
    return Array.from(get().windows.keys());
  },
}));
