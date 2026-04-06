"use client";

/**
 * Exposé Component
 * iPadOS-style window grid view for tablet.
 *
 * Per HIG-SPEC-TABLET §9:
 * - Shows all open windows in a scaled grid
 * - Tap to focus and exit Exposé
 * - Close button on each card
 * - Swipe down or tap backdrop to dismiss
 * - Staggered entry animation, 300ms ease-out
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePlatform } from "@/OS/lib/PlatformDetection";
import { useExposeStore } from "@/OS/store/exposeStore";
import { useWindowStore } from "@/OS/store/windowStore";
import { appLauncher, getAppConfig } from "@/OS/lib/AppLauncher";
import { systemBus } from "@/OS/lib/EventBus";
import styles from "./Expose.module.css";

export function Expose() {
  const platform = usePlatform();
  const isTablet = platform.type === "tablet";
  const isOpen = useExposeStore((state) => state.isOpen);
  const close = useExposeStore((state) => state.close);

  const windows = useWindowStore((state) => state.windows);
  const focusWindow = useWindowStore((state) => state.focusWindow);
  const restoreWindow = useWindowStore((state) => state.restoreWindow);

  const [closingIds, setClosingIds] = useState<Set<string>>(new Set());

  // Swipe-up-from-dock trigger
  const touchStartRef = useRef<{ y: number; time: number } | null>(null);
  const open = useExposeStore((state) => state.open);
  const toggle = useExposeStore((state) => state.toggle);

  // Listen for event bus toggle (from keyboard shortcuts)
  useEffect(() => {
    const unsubscribe = systemBus.on("expose:toggle", () => {
      toggle();
    });
    return unsubscribe;
  }, [toggle]);

  useEffect(() => {
    if (!isTablet) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      // Only trigger from dock area (bottom 70px of screen)
      const viewportHeight = globalThis.window?.innerHeight || 800;
      if (touch && touch.clientY > viewportHeight - 70) {
        touchStartRef.current = { y: touch.clientY, time: Date.now() };
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = e.changedTouches[0];
      if (!touch) return;

      const deltaY = touchStartRef.current.y - touch.clientY;
      const elapsed = Date.now() - touchStartRef.current.time;
      touchStartRef.current = null;

      // Swipe up > 80px within 500ms triggers Exposé
      if (deltaY > 80 && elapsed < 500) {
        open();
      }
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isTablet, open]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  const handleFocusWindow = useCallback(
    (windowId: string) => {
      const win = windows.get(windowId);
      if (win?.isMinimized) restoreWindow(windowId);
      focusWindow(windowId);
      close();
    },
    [windows, focusWindow, restoreWindow, close]
  );

  const handleCloseWindow = useCallback(
    (windowId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setClosingIds((prev) => new Set(prev).add(windowId));
      // Wait for animation to complete
      setTimeout(() => {
        appLauncher.close(windowId);
        setClosingIds((prev) => {
          const next = new Set(prev);
          next.delete(windowId);
          return next;
        });
        // If no more windows, close Exposé
        if (windows.size <= 1) close();
      }, 200);
    },
    [windows.size, close]
  );

  if (!isOpen) return null;

  const windowList = Array.from(windows.values());
  const count = windowList.length;

  const gridClass = [
    styles.grid,
    count === 1
      ? styles.grid1
      : count === 2
        ? styles.grid2
        : count === 3
          ? styles.grid3
          : styles.grid4,
  ].join(" ");

  return (
    <>
      <div className={styles.backdrop} onClick={close} />

      {count === 0 ? (
        <div className={styles.empty} onClick={close}>
          No open windows
        </div>
      ) : (
        <div className={gridClass}>
          {windowList.map((win) => {
            const config = getAppConfig(win.appId);
            const isClosing = closingIds.has(win.id);

            return (
              <div
                key={win.id}
                className={`${styles.card} ${isClosing ? styles.cardClosing : ""}`}
                onClick={() => !isClosing && handleFocusWindow(win.id)}
              >
                <div
                  className={styles.cardClose}
                  onClick={(e) => handleCloseWindow(win.id, e)}
                  role="button"
                  aria-label={`Close ${win.title}`}
                >
                  ×
                </div>
                <div className={styles.cardPreview}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={config?.icon || ""}
                    alt={win.title}
                    className={styles.cardIcon}
                  />
                </div>
                <span className={styles.cardTitle}>{win.title}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
