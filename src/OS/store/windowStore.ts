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
  mobile: {
    max: 10,
    warnAt: 8,
  },
};

/**
 * Check if we're on mobile (basic check, more detailed in PlatformDetection)
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

interface WindowStore {
  // State
  windows: Map<string, WindowState>;
  focusedWindowId: string | null;
  nextZIndex: number;

  // Actions
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

  // Queries
  getWindow: (windowId: string) => WindowState | undefined;
  getWindowsByApp: (appId: string) => WindowState[];
  getTopWindow: () => WindowState | undefined;
  getAllWindows: () => WindowState[];
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  // Initial state
  windows: new Map(),
  focusedWindowId: null,
  nextZIndex: 100,

  // Actions
  createWindow: (appId: string, config: WindowConfig) => {
    const { nextZIndex, focusedWindowId: previousFocusedId, windows } = get();
    
    // Check window limits per PERFORMANCE.md
    const limits = isMobileDevice() ? WINDOW_LIMITS.mobile : WINDOW_LIMITS.desktop;
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

    const windowState: WindowState = {
      id: windowId,
      appId,
      instanceId,
      title: config.title,
      icon: config.icon,

      // Position - center if not specified
      x: config.x ?? 100,
      y: config.y ?? 100,
      width: config.width,
      height: config.height,

      // Constraints
      minWidth: config.minWidth ?? DEFAULT_WINDOW_CONSTRAINTS.minWidth,
      minHeight: config.minHeight ?? DEFAULT_WINDOW_CONSTRAINTS.minHeight,
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
    set((state) => {
      const newWindows = new Map(state.windows);
      const targetWindow = newWindows.get(windowId);

      if (targetWindow) {
        newWindows.set(windowId, { ...targetWindow, x, y });
      }

      return { windows: newWindows };
    });

    // Emit event
    systemBus.emit("window:moved", { windowId, x, y });
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
}));
