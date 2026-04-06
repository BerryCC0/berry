"use client";

/**
 * AppSwitcher Component
 * iOS-style horizontal card carousel for mobile.
 *
 * Per HIG-SPEC-MOBILE §7:
 * - Trigger: long-press on tab bar (>500ms)
 * - Horizontal card carousel with snap points
 * - Cards at ~70% screen width, ~60% height
 * - Tap card to switch, swipe up to close
 * - Staggered entry animation (50ms per card)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePlatform } from "@/OS/lib/PlatformDetection";
import { useWindowStore } from "@/OS/store/windowStore";
import { useTabStore } from "@/OS/store/tabStore";
import { appLauncher, getAppConfig } from "@/OS/lib/AppLauncher";
import { systemBus } from "@/OS/lib/EventBus";
import styles from "./AppSwitcher.module.css";

export function AppSwitcher() {
  const platform = usePlatform();
  const isMobile = platform.type === "mobile";

  const [isOpen, setIsOpen] = useState(false);
  const [closingIds, setClosingIds] = useState<Set<string>>(new Set());

  const windows = useWindowStore((state) => state.windows);
  const focusWindow = useWindowStore((state) => state.focusWindow);

  const switchTab = useTabStore((state) => state.switchTab);

  // Listen for app-switcher toggle event
  useEffect(() => {
    const unsubscribe = systemBus.on("app-switcher:toggle", () => {
      setIsOpen((prev) => !prev);
    });
    return unsubscribe;
  }, []);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Handle card tap → switch to that app
  const handleCardTap = useCallback(
    (windowId: string, appId: string) => {
      focusWindow(windowId);
      // Find which tab this app belongs to and switch
      const config = getAppConfig(appId);
      if (config?.navigation?.tabConfig?.tab) {
        switchTab(config.navigation.tabConfig.tab);
      }
      setIsOpen(false);
    },
    [focusWindow, switchTab]
  );

  // Swipe-up-to-close tracking
  const swipeRef = useRef<{ startY: number; windowId: string } | null>(null);

  const handleCardTouchStart = useCallback((e: React.TouchEvent, windowId: string) => {
    const touch = e.touches[0];
    if (!touch) return;
    swipeRef.current = { startY: touch.clientY, windowId };
  }, []);

  const handleCardTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!swipeRef.current) return;
      const touch = e.changedTouches[0];
      if (!touch) return;

      const deltaY = swipeRef.current.startY - touch.clientY;
      const windowId = swipeRef.current.windowId;
      swipeRef.current = null;

      // Swipe up >80px → close
      if (deltaY > 80) {
        setClosingIds((prev) => new Set(prev).add(windowId));
        setTimeout(() => {
          appLauncher.close(windowId);
          setClosingIds((prev) => {
            const next = new Set(prev);
            next.delete(windowId);
            return next;
          });
          // If no more windows, close switcher
          if (windows.size <= 1) setIsOpen(false);
        }, 200);
      }
    },
    [windows.size]
  );

  // §9: No app switcher on Farcaster
  if (!isMobile || !isOpen) return null;

  const windowList = Array.from(windows.values());

  return (
    <>
      <div
        className={`${styles.backdrop} ${styles.backdropVisible}`}
        onClick={() => setIsOpen(false)}
      />

      {windowList.length === 0 ? (
        <div className={styles.empty} onClick={() => setIsOpen(false)}>
          No open apps
        </div>
      ) : (
        <div className={styles.carousel}>
          {windowList.map((win, index) => {
            const config = getAppConfig(win.appId);
            const isClosing = closingIds.has(win.id);

            const cardClassName = [
              styles.card,
              styles.cardEnter,
              isClosing ? styles.cardClosing : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <div
                key={win.id}
                className={cardClassName}
                style={{ "--delay": `${index * 50}ms` } as React.CSSProperties}
                onClick={() => !isClosing && handleCardTap(win.id, win.appId)}
                onTouchStart={(e) => handleCardTouchStart(e, win.id)}
                onTouchEnd={handleCardTouchEnd}
              >
                <div className={styles.cardPreview}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={config?.icon || ""}
                    alt={win.title}
                    className={styles.cardIcon}
                  />
                </div>
                <div className={styles.cardInfo}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={config?.icon || ""}
                    alt=""
                    className={styles.cardInfoIcon}
                  />
                  <span className={styles.cardTitle}>{win.title}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
