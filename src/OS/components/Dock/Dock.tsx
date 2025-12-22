"use client";

/**
 * Dock Component
 * Modern macOS-style dock with three sections:
 * 1. Pinned apps (static order, customizable by user)
 * 2. Running unpinned apps (order of opening)
 * 3. Launchpad
 *
 * Includes resizable dividers between sections.
 * Respects settings for position and auto-hide.
 */

import { useMemo, useCallback, useRef, useState, useEffect } from "react";
import { usePlatform } from "@/OS/lib/PlatformDetection";
import { useWindowStore } from "@/OS/store/windowStore";
import { useBootStore } from "@/OS/store/bootStore";
import { useDockStore } from "@/OS/store/dockStore";
import { useSettingsStore } from "@/OS/store/settingsStore";
import { appLauncher } from "@/OS/lib/AppLauncher";
import { getIcon } from "@/OS/lib/IconRegistry";
import { DockIcon } from "./components/DockIcon";
import desktopStyles from "./Dock.desktop.module.css";
import mobileStyles from "./Dock.mobile.module.css";

interface DockApp {
  appId: string;
  title: string;
  icon: string;
  windowId?: string;
  isRunning: boolean;
  isMinimized: boolean;
  isFocused: boolean;
}

export function Dock() {
  const platform = usePlatform();
  const isMobile = platform.type === "mobile" || platform.type === "farcaster";
  const styles = isMobile ? mobileStyles : desktopStyles;

  // Boot state - wait for OS to be ready
  const isBooted = useBootStore((state) => state.isBooted);

  // Dock store - pinned apps and icon size
  const pinnedApps = useDockStore((state) => state.pinnedApps);
  const iconSize = useDockStore((state) => state.iconSize);
  const setIconSize = useDockStore((state) => state.setIconSize);
  const isDockInitialized = useDockStore((state) => state.isInitialized);

  // Settings - dock position and auto-hide
  const dockPosition = useSettingsStore((state) => state.settings.desktop.dockPosition);
  const dockAutoHide = useSettingsStore((state) => state.settings.desktop.dockAutoHide);

  // Auto-hide state
  const [isVisible, setIsVisible] = useState(!dockAutoHide);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show dock on mouse enter, hide on mouse leave (if auto-hide enabled)
  const handleMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    if (dockAutoHide) {
      setIsVisible(true);
    }
  }, [dockAutoHide]);

  const handleMouseLeave = useCallback(() => {
    if (dockAutoHide) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 500); // Delay before hiding
    }
  }, [dockAutoHide]);

  // Update visibility when auto-hide setting changes
  useEffect(() => {
    setIsVisible(!dockAutoHide);
  }, [dockAutoHide]);

  // Window store
  const windows = useWindowStore((state) => state.windows);
  const focusedWindowId = useWindowStore((state) => state.focusedWindowId);
  const focusWindow = useWindowStore((state) => state.focusWindow);
  const restoreWindow = useWindowStore((state) => state.restoreWindow);

  // Resize drag state
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartSize = useRef(iconSize);

  // Build pinned apps list with running state
  const pinnedAppsWithState = useMemo(() => {
    return pinnedApps.map((pinned) => {
      const runningWindow = Array.from(windows.values()).find(
        (w) => w.appId === pinned.appId
      );

      return {
        appId: pinned.appId,
        title: pinned.title,
        icon: pinned.icon,
        windowId: runningWindow?.id,
        isRunning: !!runningWindow,
        isMinimized: runningWindow?.isMinimized || false,
        isFocused: runningWindow?.id === focusedWindowId,
      };
    });
  }, [pinnedApps, windows, focusedWindowId]);

  // Build running unpinned apps list
  const runningUnpinnedApps = useMemo(() => {
    const unpinned: DockApp[] = [];
    const pinnedAppIds = pinnedApps.map((p) => p.appId);

    windows.forEach((window) => {
      // Skip if this app is pinned
      if (pinnedAppIds.includes(window.appId)) {
        return;
      }

      // Check if we already have this app in the list
      const existing = unpinned.find((app) => app.appId === window.appId);
      if (existing) {
        return;
      }

      const config = appLauncher.getConfig(window.appId);
      unpinned.push({
        appId: window.appId,
        title: window.title,
        icon: config?.icon || window.icon || getIcon("default"),
        windowId: window.id,
        isRunning: true,
        isMinimized: window.isMinimized,
        isFocused: window.id === focusedWindowId,
      });
    });

    return unpinned;
  }, [pinnedApps, windows, focusedWindowId]);

  // Handle clicking on a dock icon
  const handleDockIconClick = useCallback(
    (app: DockApp) => {
      if (app.windowId) {
        if (app.isMinimized) {
          restoreWindow(app.windowId);
        } else {
          focusWindow(app.windowId);
        }
      } else {
        // Launch app
        appLauncher.launch(app.appId);
      }
    },
    [focusWindow, restoreWindow]
  );

  // Handle Launchpad click
  const handleLaunchpadClick = useCallback(() => {
    // TODO: Open Launchpad overlay
    console.log("[Dock] Launchpad clicked - coming soon");
  }, []);

  // Divider drag handlers for resizing
  const handleDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      dragStartY.current = e.clientY;
      dragStartSize.current = iconSize;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current) return;

        // Dragging up = larger icons, dragging down = smaller icons
        const deltaY = dragStartY.current - moveEvent.clientY;
        const newSize = dragStartSize.current + deltaY * 0.5;
        setIconSize(newSize); // Store handles clamping
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [iconSize, setIconSize]
  );

  // Don't render until boot is complete and dock is initialized
  if (!isBooted || !isDockInitialized) {
    return null;
  }

  // CSS custom property for icon size
  const dockStyle = {
    "--dock-icon-size": `${iconSize}px`,
  } as React.CSSProperties;

  // Build class names based on position and visibility
  const dockClassName = [
    styles.dock,
    styles[`dock${dockPosition.charAt(0).toUpperCase()}${dockPosition.slice(1)}`], // dockBottom, dockLeft, dockRight
    dockAutoHide && !isVisible ? styles.dockHidden : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {/* Trigger zone for auto-hide - invisible area at screen edge */}
      {dockAutoHide && (
        <div
          className={`${styles.dockTrigger} ${styles[`dockTrigger${dockPosition.charAt(0).toUpperCase()}${dockPosition.slice(1)}`]}`}
          onMouseEnter={handleMouseEnter}
        />
      )}
      <div
        className={dockClassName}
        style={dockStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={styles.dockContainer}>
        {/* Section 1: Pinned Apps */}
        <div className={styles.dockSection}>
          {pinnedAppsWithState.map((app) => (
            <DockIcon
              key={app.appId}
              app={app}
              onClick={() => handleDockIconClick(app)}
              styles={styles}
            />
          ))}
        </div>

        {/* Divider between Pinned and Unpinned (only show if there are unpinned apps) */}
        {runningUnpinnedApps.length > 0 && (
          <>
            <div
              className={styles.dockDivider}
              onMouseDown={handleDividerMouseDown}
              title="Drag to resize dock"
            />

            {/* Section 2: Running Unpinned Apps */}
            <div className={styles.dockSection}>
              {runningUnpinnedApps.map((app) => (
                <DockIcon
                  key={app.appId}
                  app={app}
                  onClick={() => handleDockIconClick(app)}
                  styles={styles}
                />
              ))}
            </div>
          </>
        )}

        {/* Divider before Launchpad */}
        <div
          className={styles.dockDivider}
          onMouseDown={handleDividerMouseDown}
          title="Drag to resize dock"
        />

        {/* Section 3: Launchpad */}
        <div className={styles.dockSection}>
          <div className={styles.dockIcon} onClick={handleLaunchpadClick}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getIcon("launchpad")}
              alt="Launchpad"
              className={styles.dockIconImage}
              draggable={false}
            />
            <span className={styles.dockIconLabel}>Launchpad</span>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
