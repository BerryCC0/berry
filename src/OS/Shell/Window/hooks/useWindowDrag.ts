"use client";

/**
 * useWindowDrag Hook
 * Handles window dragging on desktop
 * Respects settings for snap to edges.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useWindowStore } from "@/OS/store/windowStore";
import { useSettingsStore } from "@/OS/store/settingsStore";
import { usePlatform } from "@/OS/lib/PlatformDetection";

interface DragOffset {
  x: number;
  y: number;
}

export function useWindowDrag(windowId: string) {
  const platform = usePlatform();
  const isMobile = platform.type === "mobile" || platform.type === "farcaster";

  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef<DragOffset>({ x: 0, y: 0 });

  const moveWindow = useWindowStore((state) => state.moveWindow);
  const focusWindow = useWindowStore((state) => state.focusWindow);
  const getWindow = useWindowStore((state) => state.getWindow);

  // Settings - snap to edges
  const snapToEdges = useSettingsStore((state) => state.settings.windows.snapToEdges);
  const snapThreshold = useSettingsStore((state) => state.settings.windows.snapThreshold);

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // No dragging on mobile
      if (isMobile) return;

      // Focus window when drag starts
      focusWindow(windowId);

      const window = getWindow(windowId);
      if (!window) return;

      // Get client coordinates
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      dragOffset.current = {
        x: clientX - window.x,
        y: clientY - window.y,
      };

      setIsDragging(true);
    },
    [focusWindow, getWindow, isMobile, windowId]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      let newX = clientX - dragOffset.current.x;
      let newY = clientY - dragOffset.current.y;

      // Keep window at least partially visible
      const menuBarHeight = 28;
      newY = Math.max(menuBarHeight, newY);

      // Snap to edges if enabled
      if (snapToEdges) {
        const window = getWindow(windowId);
        if (window) {
          const viewportWidth = globalThis.window?.innerWidth || 0;
          const viewportHeight = globalThis.window?.innerHeight || 0;
          const dockHeight = 70; // Approximate dock height

          // Snap to left edge
          if (Math.abs(newX) < snapThreshold) {
            newX = 0;
          }

          // Snap to right edge
          if (Math.abs(newX + window.width - viewportWidth) < snapThreshold) {
            newX = viewportWidth - window.width;
          }

          // Snap to top (menu bar)
          if (Math.abs(newY - menuBarHeight) < snapThreshold) {
            newY = menuBarHeight;
          }

          // Snap to bottom (above dock)
          const bottomEdge = viewportHeight - dockHeight;
          if (Math.abs(newY + window.height - bottomEdge) < snapThreshold) {
            newY = bottomEdge - window.height;
          }
        }
      }

      moveWindow(windowId, newX, newY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    // Add listeners
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleMouseMove);
    document.addEventListener("touchend", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, moveWindow, windowId, snapToEdges, snapThreshold, getWindow]);

  return {
    handleDragStart,
    isDragging,
  };
}

