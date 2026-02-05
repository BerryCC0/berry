"use client";

/**
 * useRouteSync Hook
 * Synchronizes the URL with the current window/app state
 * 
 * - Updates URL when focused window changes
 * - Handles browser back/forward navigation
 * - Builds URLs based on app state
 * 
 * URL Format (clean, no /app/ prefix):
 *   /                    → Desktop
 *   /camp                → Camp app
 *   /camp/proposal/123   → Camp with proposal 123
 *   /treasury            → Treasury app
 *   /finder/Documents    → Finder at /Documents
 */

import { useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useWindowStore } from "@/OS/store/windowStore";
import type { WindowState } from "@/OS/types/window";

export function useRouteSync() {
  const router = useRouter();
  const pathname = usePathname();
  const windows = useWindowStore((state) => state.windows);
  const focusedWindowId = useWindowStore((state) => state.focusedWindowId);
  const focusWindow = useWindowStore((state) => state.focusWindow);
  
  // Track the focused window's appState directly to trigger re-renders
  // when internal navigation happens (e.g., clicking a proposal in Camp)
  const focusedWindowAppState = useWindowStore((state) => {
    if (!state.focusedWindowId) return null;
    const win = state.windows.get(state.focusedWindowId);
    return win?.appState ?? null;
  });

  /**
   * Build URL for a window's current state
   * Uses clean URLs without /app/ prefix
   */
  const buildUrlForWindow = useCallback((window: WindowState): string => {
    const { appId, appState } = window;

    // Simple case: just the app
    if (!appState) {
      return `/${appId}`;
    }

    // Cast to record for property access
    const state = appState as Record<string, unknown>;
    
    if (Object.keys(state).length === 0) {
      return `/${appId}`;
    }

    // Build URL based on app type
    switch (appId) {
      case "finder":
        if (state.path && state.path !== "/") {
          return `/finder${state.path}`;
        }
        return "/finder";

      case "media-viewer":
        if (state.filePath) {
          return `/media-viewer${state.filePath}`;
        }
        return "/media-viewer";

      case "text-editor":
        if (state.filePath) {
          return `/text-editor?file=${encodeURIComponent(state.filePath as string)}`;
        }
        return "/text-editor";

      case "settings":
        if (state.panel) {
          return `/settings/${state.panel}`;
        }
        return "/settings";

      case "camp":
        if (state.path && typeof state.path === 'string' && state.path.length > 0) {
          return `/camp/${state.path}`;
        }
        return "/camp";

      default:
        return `/${appId}`;
    }
  }, []);

  /**
   * Update URL when focused window changes or app state changes
   */
  useEffect(() => {
    if (!focusedWindowId) {
      // No windows focused - stay at root
      return;
    }

    const focusedWindow = windows.get(focusedWindowId);
    if (!focusedWindow) {
      return;
    }

    // Only sync if we're on root or on an app route for this window
    // This allows internal navigation (e.g., Camp proposal clicks) to update URL
    const isOnRoot = pathname === "/";
    const isOnThisAppRoute = pathname.startsWith(`/${focusedWindow.appId}`);
    
    if (!isOnRoot && !isOnThisAppRoute) {
      // We're on some other page (shouldn't happen normally)
      return;
    }

    // Build URL for current state
    const url = buildUrlForWindow(focusedWindow);
    const currentUrl = window.location.pathname;

    // Update URL without navigation (replace, not push)
    // Compare against actual browser URL
    if (url !== currentUrl) {
      window.history.replaceState(
        { windowId: focusedWindowId, appId: focusedWindow.appId },
        "",
        url
      );
    }
  }, [focusedWindowId, focusedWindowAppState, windows, pathname, buildUrlForWindow]);

  /**
   * Handle browser back/forward navigation
   */
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const path = window.location.pathname;

      // If navigating to root, do nothing special
      if (path === "/") {
        return;
      }

      // Reserved routes that shouldn't be treated as app routes
      const reservedRoutes = ["/api", "/s"];
      if (reservedRoutes.some(r => path.startsWith(r))) {
        return;
      }

      // Extract appId from path (first segment after /)
      const segments = path.split("/").filter(Boolean);
      const appId = segments[0];

      if (appId) {
        // Check if a window for this app already exists
        const existingWindow = Array.from(windows.values()).find((w) => w.appId === appId);

        if (existingWindow) {
          // Focus existing window instead of opening new one
          focusWindow(existingWindow.id);
        }
        // If no existing window, the route handler will open it
        // (this happens when user navigates back to a closed app)
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [windows, focusWindow]);

  return {
    buildUrlForWindow,
  };
}
