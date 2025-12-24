"use client";

/**
 * useRouteSync Hook
 * Synchronizes the URL with the current window/app state
 * 
 * - Updates URL when focused window changes
 * - Handles browser back/forward navigation
 * - Builds URLs based on app state
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
   */
  const buildUrlForWindow = useCallback((window: WindowState): string => {
    const { appId, appState } = window;

    // Simple case: just the app
    if (!appState) {
      return `/app/${appId}`;
    }

    // Cast to record for property access
    const state = appState as Record<string, unknown>;
    
    if (Object.keys(state).length === 0) {
      return `/app/${appId}`;
    }

    // Build URL based on app type
    switch (appId) {
      case "finder":
        if (state.path && state.path !== "/") {
          return `/app/finder${state.path}`;
        }
        return "/app/finder";

      case "media-viewer":
        if (state.filePath) {
          return `/app/media-viewer${state.filePath}`;
        }
        return "/app/media-viewer";

      case "text-editor":
        if (state.filePath) {
          return `/app/text-editor?file=${encodeURIComponent(state.filePath as string)}`;
        }
        return "/app/text-editor";

      case "settings":
        if (state.panel) {
          return `/app/settings/${state.panel}`;
        }
        return "/app/settings";

      case "camp":
        if (state.path && typeof state.path === 'string' && state.path.length > 0) {
          return `/app/camp/${state.path}`;
        }
        return "/app/camp";

      default:
        return `/app/${appId}`;
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
    const isOnThisAppRoute = pathname.startsWith(`/app/${focusedWindow.appId}`);
    
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

      // If navigating to an app route
      if (path.startsWith("/app/")) {
        const appId = path.split("/")[2];

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

