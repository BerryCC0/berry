"use client";

/**
 * useSheetGesture Hook
 * Swipe-down-to-dismiss gesture for sheet/modal components.
 *
 * Per HIG-SPEC-MOBILE §5:
 * - Trigger: vertical downward pan on a sheet component
 * - Animation: sheet translates down following finger, backdrop dims proportionally
 * - Complete: >30% of sheet height → dismiss; otherwise snap back
 */

import { useCallback, useRef } from "react";

interface SheetGestureState {
  startY: number;
  currentY: number;
  sheetHeight: number;
  isActive: boolean;
}

interface UseSheetGestureOptions {
  /** Called when the dismiss threshold is reached */
  onDismiss: () => void;
  /** Called with progress 0–1 during drag */
  onProgress?: (progress: number) => void;
  /** Called when drag is cancelled (snap back) */
  onCancel?: () => void;
  /** Threshold as fraction of sheet height (default 0.3) */
  threshold?: number;
}

export function useSheetGesture({
  onDismiss,
  onProgress,
  onCancel,
  threshold = 0.3,
}: UseSheetGestureOptions) {
  const stateRef = useRef<SheetGestureState>({
    startY: 0,
    currentY: 0,
    sheetHeight: 0,
    isActive: false,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    const target = e.currentTarget as HTMLElement;
    stateRef.current = {
      startY: touch.clientY,
      currentY: touch.clientY,
      sheetHeight: target.offsetHeight,
      isActive: true,
    };
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!stateRef.current.isActive) return;
      const touch = e.touches[0];
      if (!touch) return;

      stateRef.current.currentY = touch.clientY;
      const deltaY = Math.max(0, touch.clientY - stateRef.current.startY);
      const progress = Math.min(deltaY / stateRef.current.sheetHeight, 1);
      onProgress?.(progress);
    },
    [onProgress]
  );

  const handleTouchEnd = useCallback(() => {
    if (!stateRef.current.isActive) return;
    stateRef.current.isActive = false;

    const deltaY = stateRef.current.currentY - stateRef.current.startY;
    const ratio = deltaY / stateRef.current.sheetHeight;

    if (ratio > threshold) {
      onDismiss();
    } else {
      onCancel?.();
    }
  }, [threshold, onDismiss, onCancel]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
