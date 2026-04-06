"use client";

/**
 * useNavigationStack Hook
 * Convenience hook for apps to interact with the mobile navigation system.
 *
 * Per HIG-SPEC-MOBILE §4:
 * - Each tab maintains an independent navigation stack
 * - push/pop/popToRoot/replace
 * - URL sync via history.pushState / history.back()
 * - Maximum depth: 10
 */

import { useCallback, useEffect } from "react";
import { useTabStore, type NavigationScreen } from "@/OS/store/tabStore";

interface UseNavigationReturn {
  /** Push a new screen onto the active tab's stack */
  push: (screen: Omit<NavigationScreen, "appId"> & { appId?: string }) => void;
  /** Pop the top screen */
  pop: () => void;
  /** Pop to root of the active tab's stack */
  popToRoot: () => void;
  /** Replace the current (top) screen */
  replace: (screen: Omit<NavigationScreen, "appId"> & { appId?: string }) => void;
  /** Current (top) screen */
  currentScreen: NavigationScreen | undefined;
  /** Stack depth */
  depth: number;
  /** Whether a back button should show */
  canGoBack: boolean;
}

/**
 * App-facing navigation hook. Apps use this to push/pop screens
 * within their tab's navigation stack.
 *
 * @param appId — the calling app's ID (used as default for pushed screens)
 */
export function useNavigationStack(appId: string): UseNavigationReturn {
  const storePush = useTabStore((state) => state.push);
  const storePop = useTabStore((state) => state.pop);
  const storePopToRoot = useTabStore((state) => state.popToRoot);
  const storeReplace = useTabStore((state) => state.replace);
  const getCurrentScreen = useTabStore((state) => state.getCurrentScreen);
  const getDepth = useTabStore((state) => state.getDepth);

  const currentScreen = getCurrentScreen();
  const depth = getDepth();

  // Push with URL sync
  const push = useCallback(
    (screen: Omit<NavigationScreen, "appId"> & { appId?: string }) => {
      const fullScreen: NavigationScreen = {
        appId: screen.appId || appId,
        screenId: screen.screenId,
        title: screen.title,
        params: screen.params,
        largeTitleEnabled: screen.largeTitleEnabled,
      };
      storePush(fullScreen);

      // Sync URL
      const url = `/${fullScreen.appId}/${fullScreen.screenId}`;
      if (typeof window !== "undefined") {
        window.history.pushState({ screen: fullScreen }, "", url);
      }
    },
    [appId, storePush]
  );

  // Pop with URL sync
  const pop = useCallback(() => {
    const popped = storePop();
    if (popped && typeof window !== "undefined") {
      window.history.back();
    }
  }, [storePop]);

  const popToRoot = useCallback(() => {
    storePopToRoot();
    // Replace URL with root
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", "/");
    }
  }, [storePopToRoot]);

  const replace = useCallback(
    (screen: Omit<NavigationScreen, "appId"> & { appId?: string }) => {
      const fullScreen: NavigationScreen = {
        appId: screen.appId || appId,
        screenId: screen.screenId,
        title: screen.title,
        params: screen.params,
        largeTitleEnabled: screen.largeTitleEnabled,
      };
      storeReplace(fullScreen);

      const url = `/${fullScreen.appId}/${fullScreen.screenId}`;
      if (typeof window !== "undefined") {
        window.history.replaceState({ screen: fullScreen }, "", url);
      }
    },
    [appId, storeReplace]
  );

  // Listen for browser back/forward to sync with our stack
  useEffect(() => {
    const handlePopState = () => {
      // On browser back, pop from our stack (without doing history.back again)
      storePop();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, [storePop]);

  return {
    push,
    pop,
    popToRoot,
    replace,
    currentScreen,
    depth,
    canGoBack: depth > 1,
  };
}
