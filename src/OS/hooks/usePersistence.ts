"use client";

/**
 * Persistence Hooks
 * Hooks for auto-saving and loading persisted data.
 */

import { useEffect, useRef, useCallback } from "react";
import { persistence } from "@/OS/lib/Persistence";
import { useDockStore } from "@/OS/store/dockStore";
import { useDesktopStore } from "@/OS/store/desktopStore";
import { useSettingsStore } from "@/OS/store/settingsStore";
import type { DockConfig, DesktopLayout } from "@/OS/lib/Persistence/types";
import type { SystemSettings } from "@/OS/types/settings";

// Debounce delay for auto-save (2 seconds)
const DEBOUNCE_MS = 2000;

/**
 * Debounce helper
 */
function useDebouncedCallback<A extends unknown[], R>(
  callback: (...args: A) => R,
  delay: number
): (...args: A) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args: A) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Hook to auto-save dock configuration when it changes
 */
export function useDockPersistence() {
  const pinnedApps = useDockStore((state) => state.pinnedApps);
  const iconSize = useDockStore((state) => state.iconSize);
  const isInitialized = useDockStore((state) => state.isInitialized);

  // Debounced save function
  const debouncedSave = useDebouncedCallback(async (config: DockConfig) => {
    if (!persistence.isPersistent()) return;

    try {
      await persistence.saveDockConfig(config);
      if (process.env.NODE_ENV === "development") {
        console.log("[useDockPersistence] Dock config saved");
      }
    } catch (error) {
      console.error("[useDockPersistence] Failed to save dock config:", error);
    }
  }, DEBOUNCE_MS);

  // Auto-save when dock config changes
  useEffect(() => {
    if (!isInitialized) return;

    const config: DockConfig = {
      pinnedApps,
      iconSize,
    };

    debouncedSave(config);
  }, [pinnedApps, iconSize, isInitialized, debouncedSave]);
}

/**
 * Hook to auto-save settings when they change
 */
export function useSettingsPersistence() {
  const settings = useSettingsStore((state) => state.settings);
  const isInitialized = useSettingsStore((state) => state.isInitialized);

  // Debounced save function
  const debouncedSave = useDebouncedCallback(
    async (settingsData: SystemSettings) => {
      if (!persistence.isPersistent()) return;

      try {
        await persistence.saveSettings(settingsData);
        if (process.env.NODE_ENV === "development") {
          console.log("[useSettingsPersistence] Settings saved");
        }
      } catch (error) {
        console.error("[useSettingsPersistence] Failed to save settings:", error);
      }
    },
    DEBOUNCE_MS
  );

  // Auto-save when settings change
  useEffect(() => {
    if (!isInitialized) return;
    debouncedSave(settings);
  }, [settings, isInitialized, debouncedSave]);
}

/**
 * Hook to auto-save desktop layout when it changes
 */
export function useDesktopPersistence() {
  const icons = useDesktopStore((state) => state.icons);
  const gridSize = useDesktopStore((state) => state.gridSize);
  const snapToGrid = useDesktopStore((state) => state.snapToGrid);

  // Debounced save function
  const debouncedSave = useDebouncedCallback(async (layout: DesktopLayout) => {
    if (!persistence.isPersistent()) return;

    try {
      await persistence.saveDesktopLayout(layout);
      if (process.env.NODE_ENV === "development") {
        console.log("[useDesktopPersistence] Desktop layout saved");
      }
    } catch (error) {
      console.error("[useDesktopPersistence] Failed to save desktop layout:", error);
    }
  }, DEBOUNCE_MS);

  // Auto-save when desktop layout changes
  useEffect(() => {
    const layout: DesktopLayout = {
      icons: Array.from(icons.values()).map((icon) => ({
        id: icon.id,
        appId: icon.appId,
        label: icon.label,
        icon: icon.icon,
        x: icon.x,
        y: icon.y,
      })),
      gridSize,
      snapToGrid,
    };

    debouncedSave(layout);
  }, [icons, gridSize, snapToGrid, debouncedSave]);
}

/**
 * Master hook that enables all persistence auto-saves
 * Use this in a top-level component
 */
export function usePersistence() {
  useDockPersistence();
  useSettingsPersistence();
  useDesktopPersistence();
}
