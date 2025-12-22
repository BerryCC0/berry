/**
 * Window Manager
 * Higher-level window operations that coordinate across stores
 * 
 * This is the SERVICE layer. windowStore is the STATE layer.
 * WindowManager uses windowStore internally but provides:
 * - Smart positioning (cascade, tile)
 * - Boundary enforcement
 * - Window queries (find at coordinate)
 * - Multi-window operations
 */

import { useWindowStore } from "@/OS/store/windowStore";
import { systemBus } from "./EventBus";
import type { WindowState, WindowConfig } from "@/OS/types/window";

/** Cascade offset for new windows */
const CASCADE_OFFSET_X = 24;
const CASCADE_OFFSET_Y = 24;

/** Minimum visible area when window is dragged off-screen */
const MIN_VISIBLE_AREA = 50;

/** Menu bar height */
const MENU_BAR_HEIGHT = 24;

/** Dock height (approximate for calculations) */
const DOCK_HEIGHT = 70;

/**
 * Get viewport dimensions (usable area for windows)
 */
export function getViewportBounds(): { width: number; height: number; top: number; bottom: number } {
  if (typeof window === "undefined") {
    return { width: 1024, height: 768, top: MENU_BAR_HEIGHT, bottom: 768 - DOCK_HEIGHT };
  }
  
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    top: MENU_BAR_HEIGHT,
    bottom: window.innerHeight - DOCK_HEIGHT,
  };
}

/**
 * Calculate cascade position for a new window
 * Positions window offset from the last focused window, or centered if none
 */
export function getCascadePosition(width: number, height: number): { x: number; y: number } {
  const store = useWindowStore.getState();
  const windows = store.getAllWindows();
  const viewport = getViewportBounds();
  
  // If no windows, center the new one
  if (windows.length === 0) {
    return {
      x: Math.max(0, (viewport.width - width) / 2),
      y: Math.max(viewport.top, (viewport.bottom - height) / 2),
    };
  }
  
  // Find the topmost (highest z-index) window
  const topWindow = windows.reduce((top, win) => 
    win.zIndex > top.zIndex ? win : top
  , windows[0]);
  
  // Calculate cascade position
  let x = topWindow.x + CASCADE_OFFSET_X;
  let y = topWindow.y + CASCADE_OFFSET_Y;
  
  // Wrap around if we'd go off-screen
  if (x + width > viewport.width - MIN_VISIBLE_AREA) {
    x = CASCADE_OFFSET_X;
  }
  if (y + height > viewport.bottom - MIN_VISIBLE_AREA) {
    y = viewport.top + CASCADE_OFFSET_Y;
  }
  
  return { x, y };
}

/**
 * Tile all visible windows in a grid
 */
export function tileWindows(): void {
  const store = useWindowStore.getState();
  const windows = store.getAllWindows().filter(w => !w.isMinimized);
  
  if (windows.length === 0) return;
  
  const viewport = getViewportBounds();
  const usableHeight = viewport.bottom - viewport.top;
  
  // Calculate grid dimensions
  const cols = Math.ceil(Math.sqrt(windows.length));
  const rows = Math.ceil(windows.length / cols);
  
  const tileWidth = Math.floor(viewport.width / cols);
  const tileHeight = Math.floor(usableHeight / rows);
  
  windows.forEach((win, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    const x = col * tileWidth;
    const y = viewport.top + row * tileHeight;
    const width = tileWidth;
    const height = tileHeight;
    
    store.moveWindow(win.id, x, y);
    if (win.isResizable) {
      store.resizeWindow(win.id, width, height);
    }
  });
  
  systemBus.emit("window:moved", { 
    windowId: "all", 
    x: 0, 
    y: 0 
  });
}

/**
 * Stack all windows (cascade from top-left)
 */
export function stackWindows(): void {
  const store = useWindowStore.getState();
  const windows = store.getAllWindows().filter(w => !w.isMinimized);
  
  if (windows.length === 0) return;
  
  const viewport = getViewportBounds();
  
  windows.forEach((win, index) => {
    const x = CASCADE_OFFSET_X + (index * CASCADE_OFFSET_X);
    const y = viewport.top + CASCADE_OFFSET_Y + (index * CASCADE_OFFSET_Y);
    
    store.moveWindow(win.id, x, y);
    store.focusWindow(win.id);
  });
}

/**
 * Find window at a specific coordinate
 * Returns the topmost window (highest z-index) at that point
 */
export function findWindowAt(x: number, y: number): WindowState | null {
  const store = useWindowStore.getState();
  const windows = store.getAllWindows()
    .filter(w => !w.isMinimized)
    .sort((a, b) => b.zIndex - a.zIndex); // Highest z-index first
  
  for (const win of windows) {
    if (
      x >= win.x &&
      x <= win.x + win.width &&
      y >= win.y &&
      y <= win.y + win.height
    ) {
      return win;
    }
  }
  
  return null;
}

/**
 * Enforce window boundaries - keep window visible on screen
 * Call this after viewport resize or when checking window positions
 */
export function enforceWindowBounds(windowId: string): void {
  const store = useWindowStore.getState();
  const win = store.getWindow(windowId);
  
  if (!win || win.isMinimized) return;
  
  const viewport = getViewportBounds();
  
  let x = win.x;
  let y = win.y;
  let needsMove = false;
  
  // Ensure at least MIN_VISIBLE_AREA is visible on each edge
  if (x + win.width < MIN_VISIBLE_AREA) {
    x = MIN_VISIBLE_AREA - win.width;
    needsMove = true;
  }
  if (x > viewport.width - MIN_VISIBLE_AREA) {
    x = viewport.width - MIN_VISIBLE_AREA;
    needsMove = true;
  }
  if (y < viewport.top) {
    y = viewport.top;
    needsMove = true;
  }
  if (y > viewport.bottom - MIN_VISIBLE_AREA) {
    y = viewport.bottom - MIN_VISIBLE_AREA;
    needsMove = true;
  }
  
  if (needsMove) {
    store.moveWindow(windowId, x, y);
  }
}

/**
 * Enforce boundaries on all windows
 * Useful after viewport resize
 */
export function enforceAllWindowBounds(): void {
  const store = useWindowStore.getState();
  const windows = store.getAllWindows();
  
  windows.forEach(win => {
    enforceWindowBounds(win.id);
  });
}

/**
 * Minimize all windows
 */
export function minimizeAllWindows(): void {
  const store = useWindowStore.getState();
  const windows = store.getAllWindows().filter(w => !w.isMinimized);
  
  windows.forEach(win => {
    store.minimizeWindow(win.id);
  });
}

/**
 * Close all windows (with optional app filter)
 */
export function closeAllWindows(appId?: string): void {
  const store = useWindowStore.getState();
  const windows = appId 
    ? store.getWindowsByApp(appId)
    : store.getAllWindows();
  
  windows.forEach(win => {
    store.closeWindow(win.id);
  });
}

/**
 * Bring all windows of an app to front
 */
export function bringAppToFront(appId: string): void {
  const store = useWindowStore.getState();
  const windows = store.getWindowsByApp(appId);
  
  // Focus each window in order, last one ends up on top
  windows.forEach(win => {
    if (!win.isMinimized) {
      store.focusWindow(win.id);
    }
  });
}

/**
 * Cycle focus to next window
 */
export function focusNextWindow(): void {
  const store = useWindowStore.getState();
  const windows = store.getAllWindows()
    .filter(w => !w.isMinimized)
    .sort((a, b) => a.zIndex - b.zIndex);
  
  if (windows.length === 0) return;
  
  const focusedId = store.focusedWindowId;
  const currentIndex = windows.findIndex(w => w.id === focusedId);
  const nextIndex = (currentIndex + 1) % windows.length;
  
  store.focusWindow(windows[nextIndex].id);
}

/**
 * Cycle focus to previous window
 */
export function focusPreviousWindow(): void {
  const store = useWindowStore.getState();
  const windows = store.getAllWindows()
    .filter(w => !w.isMinimized)
    .sort((a, b) => a.zIndex - b.zIndex);
  
  if (windows.length === 0) return;
  
  const focusedId = store.focusedWindowId;
  const currentIndex = windows.findIndex(w => w.id === focusedId);
  const prevIndex = currentIndex <= 0 ? windows.length - 1 : currentIndex - 1;
  
  store.focusWindow(windows[prevIndex].id);
}

/**
 * Window Manager singleton for convenient access
 */
export const windowManager = {
  // Positioning
  getCascadePosition,
  getViewportBounds,
  
  // Arrangement
  tileWindows,
  stackWindows,
  
  // Queries
  findWindowAt,
  
  // Boundaries
  enforceWindowBounds,
  enforceAllWindowBounds,
  
  // Bulk operations
  minimizeAllWindows,
  closeAllWindows,
  bringAppToFront,
  
  // Focus cycling
  focusNextWindow,
  focusPreviousWindow,
};

