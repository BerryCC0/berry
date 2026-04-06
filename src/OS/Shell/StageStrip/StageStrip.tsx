"use client";

/**
 * StageStrip Component
 * iPadOS Stage Manager recent apps strip.
 *
 * Per HIG-SPEC-TABLET §3:
 * - Left side, 80px wide, max 5 app thumbnails
 * - Tapping a thumbnail focuses that app and stages the current one
 * - Auto-hides when window dragged within 100px of left edge
 * - Reappears on left-edge swipe or after 1s idle
 * - MRU ordered (most recently used at top)
 */

import { useCallback, useEffect, useRef } from "react";
import { usePlatform } from "@/OS/lib/PlatformDetection";
import { useStageStore } from "@/OS/store/stageStore";
import { useWindowStore } from "@/OS/store/windowStore";
import { getAppConfig } from "@/OS/lib/AppLauncher";
import { systemBus } from "@/OS/lib/EventBus";
import styles from "./StageStrip.module.css";

export function StageStrip() {
  const platform = usePlatform();
  const isTablet = platform.type === "tablet";

  const stagedApps = useStageStore((state) => state.stagedApps);
  const isStripVisible = useStageStore((state) => state.isStripVisible);
  const setStripVisible = useStageStore((state) => state.setStripVisible);
  const unstageApp = useStageStore((state) => state.unstageApp);
  const stageApp = useStageStore((state) => state.stageApp);

  const focusedWindowId = useWindowStore((state) => state.focusedWindowId);
  const focusWindow = useWindowStore((state) => state.focusWindow);
  const windows = useWindowStore((state) => state.windows);

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for Cmd+H (hide current app to Stage Strip)
  useEffect(() => {
    if (!isTablet) return;
    const unsubscribe = systemBus.on("stage:hide-current", () => {
      if (!focusedWindowId) return;
      const win = windows.get(focusedWindowId);
      if (!win) return;
      const config = getAppConfig(win.appId);
      stageApp({
        appId: win.appId,
        windowId: focusedWindowId,
        title: win.title,
        icon: config?.icon || "",
      });
    });
    return unsubscribe;
  }, [isTablet, focusedWindowId, windows, stageApp]);

  // Auto-show strip after 1s of no drag activity near left edge
  useEffect(() => {
    if (!isTablet) return;
    if (isStripVisible) return;

    hideTimerRef.current = setTimeout(() => {
      setStripVisible(true);
    }, 1000);

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isTablet, isStripVisible, setStripVisible]);

  // Left-edge touch listener to reveal strip
  useEffect(() => {
    if (!isTablet) return;

    const handleTouch = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch && touch.clientX < 20) {
        setStripVisible(true);
      }
    };

    document.addEventListener("touchstart", handleTouch);
    return () => document.removeEventListener("touchstart", handleTouch);
  }, [isTablet, setStripVisible]);

  const handleTapSlot = useCallback(
    (windowId: string) => {
      // Unstage the tapped app
      const app = unstageApp(windowId);
      if (!app) return;

      // Stage the currently focused app if there is one
      if (focusedWindowId) {
        const currentWin = windows.get(focusedWindowId);
        if (currentWin) {
          const config = getAppConfig(currentWin.appId);
          stageApp({
            appId: currentWin.appId,
            windowId: focusedWindowId,
            title: currentWin.title,
            icon: config?.icon || "",
          });
        }
      }

      // Focus the tapped window
      focusWindow(windowId);
    },
    [unstageApp, focusedWindowId, windows, stageApp, focusWindow]
  );

  // Only render on tablet
  if (!isTablet) return null;

  const stripClassName = [
    styles.stageStrip,
    !isStripVisible ? styles.stageStripHidden : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={stripClassName}>
      {stagedApps.map((app) => (
        <div
          key={app.windowId}
          className={styles.stageSlot}
          onClick={() => handleTapSlot(app.windowId)}
          role="button"
          tabIndex={0}
          aria-label={`Switch to ${app.title}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleTapSlot(app.windowId);
            }
          }}
        >
          <div className={styles.stageThumb}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={app.icon}
              alt={app.title}
              className={styles.stageIcon}
            />
          </div>
          <span className={styles.stageLabel}>{app.title}</span>
        </div>
      ))}
    </div>
  );
}
