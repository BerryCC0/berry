"use client";

/**
 * useWindowResize Hook
 * Handles window resizing on desktop
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useWindowStore } from "@/OS/store/windowStore";
import { usePlatform } from "@/OS/lib/PlatformDetection";

interface ResizeState {
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startWindowX: number;
  startWindowY: number;
}

const RESIZE_EDGES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

export function useWindowResize(windowId: string) {
  const platform = usePlatform();
  const isMobile = platform.type === "mobile" || platform.type === "farcaster";

  const [isResizing, setIsResizing] = useState(false);
  const [resizeEdge, setResizeEdge] = useState<string | null>(null);
  const initialState = useRef<ResizeState>({
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    startWindowX: 0,
    startWindowY: 0,
  });

  const resizeWindow = useWindowStore((state) => state.resizeWindow);
  const moveWindow = useWindowStore((state) => state.moveWindow);
  const getWindow = useWindowStore((state) => state.getWindow);

  const handleResizeStart = useCallback(
    (edge: string, e: React.MouseEvent) => {
      if (isMobile) return;

      e.preventDefault();
      e.stopPropagation();

      const window = getWindow(windowId);
      if (!window) return;

      initialState.current = {
        startX: e.clientX,
        startY: e.clientY,
        startWidth: window.width,
        startHeight: window.height,
        startWindowX: window.x,
        startWindowY: window.y,
      };

      setResizeEdge(edge);
      setIsResizing(true);
    },
    [getWindow, isMobile, windowId]
  );

  useEffect(() => {
    if (!isResizing || !resizeEdge) return;

    const handleMouseMove = (e: MouseEvent) => {
      const window = getWindow(windowId);
      if (!window) return;

      const dx = e.clientX - initialState.current.startX;
      const dy = e.clientY - initialState.current.startY;

      let newWidth = initialState.current.startWidth;
      let newHeight = initialState.current.startHeight;
      let newX = initialState.current.startWindowX;
      let newY = initialState.current.startWindowY;

      // Handle horizontal resizing
      if (resizeEdge.includes("e")) {
        newWidth = initialState.current.startWidth + dx;
      }
      if (resizeEdge.includes("w")) {
        newWidth = initialState.current.startWidth - dx;
        newX = initialState.current.startWindowX + dx;
      }

      // Handle vertical resizing
      if (resizeEdge.includes("s")) {
        newHeight = initialState.current.startHeight + dy;
      }
      if (resizeEdge.includes("n")) {
        newHeight = initialState.current.startHeight - dy;
        newY = initialState.current.startWindowY + dy;
      }

      // Apply constraints
      const constrainedWidth = Math.max(
        window.minWidth,
        window.maxWidth ? Math.min(newWidth, window.maxWidth) : newWidth
      );
      const constrainedHeight = Math.max(
        window.minHeight,
        window.maxHeight ? Math.min(newHeight, window.maxHeight) : newHeight
      );

      // Adjust position if resizing from left or top
      if (resizeEdge.includes("w") && constrainedWidth !== newWidth) {
        newX = initialState.current.startWindowX + (initialState.current.startWidth - constrainedWidth);
      }
      if (resizeEdge.includes("n") && constrainedHeight !== newHeight) {
        newY = initialState.current.startWindowY + (initialState.current.startHeight - constrainedHeight);
      }

      // Update window
      resizeWindow(windowId, constrainedWidth, constrainedHeight);
      if (resizeEdge.includes("w") || resizeEdge.includes("n")) {
        moveWindow(windowId, newX, newY);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeEdge(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, resizeEdge, getWindow, moveWindow, resizeWindow, windowId]);

  return {
    handleResizeStart,
    isResizing,
    resizeHandles: isMobile ? [] : RESIZE_EDGES,
  };
}

