"use client";

/**
 * useApplySettings Hook
 * Watches settings store and applies changes to the DOM in real-time.
 * 
 * Note: This hook handles LIVE changes to settings after boot.
 * The initial settings application during boot is handled by useBootSequence.
 */

import { useEffect, useRef } from "react";
import { useSettingsStore } from "@/OS/store/settingsStore";
import { useBootStore } from "@/OS/store/bootStore";
import { applyAppearance, applyAccessibility } from "@/OS/lib/Settings";

/**
 * Hook to apply settings changes in real-time
 * Use this in a top-level component (e.g., page.tsx)
 */
export function useApplySettings() {
  const appearance = useSettingsStore((state) => state.settings.appearance);
  const accessibility = useSettingsStore((state) => state.settings.accessibility);
  const isInitialized = useSettingsStore((state) => state.isInitialized);
  const isReady = useBootStore((state) => state.isReady);
  
  // Track previous values to detect actual changes
  const prevAppearance = useRef(appearance);
  const prevAccessibility = useRef(accessibility);

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

