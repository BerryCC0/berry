"use client";

/**
 * useApplySettings Hook
 * Watches settings store and applies changes to the DOM in real-time.
 *
 * Note: This hook handles LIVE changes to settings after boot.
 * The initial settings application during boot is handled by useBootSequence.
 *
 * Also handles `colorScheme: "auto"` by listening to the OS-level
 * `prefers-color-scheme` media query and syncing it to `darkMode`.
 */

import { useEffect, useRef } from "react";
import { useSettingsStore } from "@/OS/store/settingsStore";
import { useShallow } from "zustand/shallow";
import { useBootStore } from "@/OS/store/bootStore";
import { applyAppearance, applyAccessibility } from "@/OS/lib/Settings";

/**
 * Hook to apply settings changes in real-time
 * Use this in a top-level component (e.g., page.tsx)
 *
 * Uses useShallow to avoid the React 19 "getSnapshot should be cached"
 * infinite loop — Zustand object selectors must return stable references.
 */
export function useApplySettings() {
  const appearance = useSettingsStore(
    useShallow((state) => state.settings.appearance)
  );
  const accessibility = useSettingsStore(
    useShallow((state) => state.settings.accessibility)
  );
  const isInitialized = useSettingsStore((state) => state.isInitialized);
  const isReady = useBootStore((state) => state.isReady);
  const setSetting = useSettingsStore((state) => state.setSetting);

  // Track previous values to detect actual changes
  const prevAppearance = useRef(appearance);
  const prevAccessibility = useRef(accessibility);

  // --- prefers-color-scheme auto-detection ---
  // When colorScheme is "auto", sync darkMode to the OS preference.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (appearance.colorScheme !== "auto") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    // Sync the current OS preference immediately
    const sync = (dark: boolean) => {
      if (appearance.darkMode !== dark) {
        setSetting("appearance", "darkMode", dark);
      }
    };

    sync(mq.matches);

    const handler = (e: MediaQueryListEvent) => sync(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [appearance.colorScheme, appearance.darkMode, setSetting]);

  // Apply appearance settings when they change AFTER boot is complete
  useEffect(() => {
    // Only apply live changes after boot is complete
    if (!isReady || !isInitialized) return;

    // Check if this is an actual change (not the initial value)
    if (prevAppearance.current !== appearance) {
      applyAppearance(appearance);
      prevAppearance.current = appearance;
    }
  }, [appearance, isInitialized, isReady]);

  // Apply accessibility settings when they change AFTER boot is complete
  useEffect(() => {
    if (!isReady || !isInitialized) return;

    if (prevAccessibility.current !== accessibility) {
      applyAccessibility(accessibility);
      prevAccessibility.current = accessibility;
    }
  }, [accessibility, isInitialized, isReady]);
}

