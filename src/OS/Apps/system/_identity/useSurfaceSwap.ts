"use client";

/**
 * Surface swap — the "two faces of one app" trick.
 *
 * Wallet and Names are technically two singleton apps in OSAppConfig. The
 * swap creates the illusion of one app with two surfaces by:
 *   1. Fading out the current window (100ms)
 *   2. Closing it
 *   3. Launching the target app at the same coords + size
 *   4. Fading in the new window (100ms)
 *
 * Both apps share IdentityShell so the chrome is identical across the
 * swap. Total animation ~200ms.
 */

import { useCallback } from "react";
import { useWindowStore } from "@/OS/store/windowStore";
import { closeApp, launchApp } from "@/OS/lib/AppLauncher";

export interface UseSurfaceSwapResult {
  swap: () => Promise<string | null>;
}

const FADE_MS = 100;

function applyFadeOut(windowId: string): Promise<void> {
  return new Promise((resolve) => {
    const el = typeof document !== "undefined"
      ? (document.querySelector(`[data-window-id="${windowId}"]`) as HTMLElement | null)
      : null;
    if (!el) {
      resolve();
      return;
    }
    el.classList.add("berry-window-fading-out");
    window.setTimeout(resolve, FADE_MS);
  });
}

function applyFadeIn(windowId: string): void {
  if (typeof document === "undefined") return;
  // Wait for the new window's DOM to mount before applying the class.
  window.requestAnimationFrame(() => {
    const el = document.querySelector(`[data-window-id="${windowId}"]`) as HTMLElement | null;
    el?.classList.add("berry-window-fading-in");
  });
}

export function useSurfaceSwap(currentWindowId: string, toAppId: string): UseSurfaceSwapResult {
  const swap = useCallback(async () => {
    const win = useWindowStore.getState().getWindow(currentWindowId);
    if (!win) return null;

    const { x, y, width, height } = win;

    await applyFadeOut(currentWindowId);
    closeApp(currentWindowId);

    const newId = launchApp(toAppId, { x, y, width, height, focus: true });
    if (newId) applyFadeIn(newId);
    return newId;
  }, [currentWindowId, toAppId]);

  return { swap };
}
