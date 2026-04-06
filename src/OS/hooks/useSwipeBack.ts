"use client";

/**
 * useSwipeBack Hook
 * Left-edge swipe gesture for navigating back.
 *
 * Per HIG-SPEC-MOBILE §5:
 * - Trigger: touchstart within 20px of left edge, >50px rightward move
 * - Interactive: animation follows finger position
 * - Complete: >50% screen width OR velocity >500px/s → commit pop
 * - Otherwise: snap back
 */

import { useCallback, useEffect, useRef } from "react";
import { useTabStore } from "@/OS/store/tabStore";

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
  isTracking: boolean;
  hasCommitted: boolean;
}

/**
 * Attaches a swipe-from-left-edge gesture to the given element ref.
 * When the gesture completes, calls pop() on the active tab's stack.
 *
 * @param containerRef — ref to the content container element
 * @param enabled — whether swipe back is active (e.g., depth > 1)
 * @param onProgress — optional callback with progress 0–1 for animation
 * @param onComplete — optional callback when swipe completes (pop)
 * @param onCancel — optional callback when swipe is cancelled (snap back)
 */
export function useSwipeBack(
  containerRef: React.RefObject<HTMLElement | null>,
  enabled: boolean,
  onProgress?: (progress: number) => void,
  onComplete?: () => void,
  onCancel?: () => void,
) {
  const pop = useTabStore((state) => state.pop);
  const swipeRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    isTracking: false,
    hasCommitted: false,
  });

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;
      const touch = e.touches[0];
      if (!touch) return;

      // Only start tracking if touch is within 20px of left edge
      if (touch.clientX > 20) return;

      swipeRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        isTracking: true,
        hasCommitted: false,
      };
    },
    [enabled]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const state = swipeRef.current;
      if (!state.isTracking || state.hasCommitted) return;

      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - state.startX;
      const deltaY = Math.abs(touch.clientY - state.startY);

      // If moving more vertically than horizontally, cancel
      if (deltaY > Math.abs(deltaX) && deltaX < 50) {
        state.isTracking = false;
        onCancel?.();
        return;
      }

      // Only track rightward movement
      if (deltaX < 0) return;

      // Report progress
      const screenWidth = globalThis.window?.innerWidth || 375;
      const progress = Math.min(deltaX / screenWidth, 1);
      onProgress?.(progress);
    },
    [onProgress, onCancel]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      const state = swipeRef.current;
      if (!state.isTracking || state.hasCommitted) return;
      state.isTracking = false;

      const touch = e.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - state.startX;
      const elapsed = Date.now() - state.startTime;
      const velocity = deltaX / (elapsed || 1) * 1000; // px/s
      const screenWidth = globalThis.window?.innerWidth || 375;

      // Commit if >50% of screen width OR velocity >500px/s
      if (deltaX > screenWidth * 0.5 || velocity > 500) {
        state.hasCommitted = true;
        pop();
        onComplete?.();
      } else {
        onCancel?.();
      }
    },
    [pop, onComplete, onCancel]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [containerRef, enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);
}
