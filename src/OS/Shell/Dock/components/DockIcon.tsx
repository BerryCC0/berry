"use client";

/**
 * DockIcon Component
 * Individual dock icon with running indicator, tooltip, bounce animation,
 * and right-click context menu.
 *
 * Per HIG-SPEC-DESKTOP §4:
 * - Tooltip on hover (handled by CSS .dockIconLabel)
 * - Bounce animation reserved for "app needs attention" (not on launch)
 * - Right-click context menu: Options, Keep in Dock / Remove from Dock, Quit
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useDockStore } from "@/OS/store/dockStore";
import { appLauncher } from "@/OS/lib/AppLauncher";

interface DockApp {
  appId: string;
  title: string;
  icon: string;
  windowId?: string;
  isRunning: boolean;
  isMinimized: boolean;
  isFocused: boolean;
}

interface DockIconProps {
  app: DockApp;
  onClick: () => void;
  styles: Record<string, string>;
}

export function DockIcon({ app, onClick, styles }: DockIconProps) {
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const pinnedApps = useDockStore((state) => state.pinnedApps);
  const pinApp = useDockStore((state) => state.pinApp);
  const unpinApp = useDockStore((state) => state.unpinApp);

  const isPinned = pinnedApps.some((p) => p.appId === app.appId);

  // Close context menu on outside click
  useEffect(() => {
    if (!showContextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showContextMenu]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu((prev) => !prev);
  }, []);

  const handleKeepInDock = useCallback(() => {
    if (!isPinned) {
      pinApp({ appId: app.appId, title: app.title, icon: app.icon });
    }
    setShowContextMenu(false);
  }, [isPinned, pinApp, app]);

  const handleRemoveFromDock = useCallback(() => {
    if (isPinned) {
      unpinApp(app.appId);
    }
    setShowContextMenu(false);
  }, [isPinned, unpinApp, app.appId]);

  const handleQuit = useCallback(() => {
    if (app.windowId) {
      appLauncher.close(app.windowId);
    }
    setShowContextMenu(false);
  }, [app.windowId]);

  const iconClassName = [
    styles.dockIcon,
    app.isFocused ? styles.dockIconFocused : "",
  ]
    .filter(Boolean)
    .join(" ");

  const indicatorClassName = [
    styles.runningIndicator,
    app.isMinimized ? styles.minimizedIndicator : "",
  ]
    .filter(Boolean)
    .join(" ");

  const firstLetter = app.title.charAt(0).toUpperCase();

  return (
    <div
      className={iconClassName}
      onClick={onClick}
      onContextMenu={handleContextMenu}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${app.title}${app.isRunning ? " (running)" : ""}${app.isFocused ? ", focused" : ""}`}
    >
      {!imageLoadFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={app.icon}
          alt={app.title}
          className={styles.dockIconImage}
          draggable={false}
          onError={() => {
            setImageLoadFailed(true);
          }}
        />
      ) : (
        <div
          className={styles.dockIconImage}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#808080",
            color: "#ffffff",
            fontSize: "20px",
            fontWeight: "bold",
            width: "100%",
            height: "100%",
            borderRadius: "4px",
          }}
        >
          {firstLetter}
        </div>
      )}

      <span className={styles.dockIconLabel}>{app.title}</span>

      {app.isRunning && <div className={indicatorClassName} />}

      {/* Right-click context menu */}
      {showContextMenu && (
        <div
          ref={contextMenuRef}
          className={styles.dockContextMenu}
          onClick={(e) => e.stopPropagation()}
        >
          {app.isRunning && !isPinned && (
            <div className={styles.dockContextMenuItem} onClick={handleKeepInDock}>
              Keep in Dock
            </div>
          )}
          {isPinned && !app.isRunning && (
            <div className={styles.dockContextMenuItem} onClick={handleRemoveFromDock}>
              Remove from Dock
            </div>
          )}
          {isPinned && app.isRunning && (
            <>
              <div className={styles.dockContextMenuItem} onClick={handleRemoveFromDock}>
                Remove from Dock
              </div>
              <div className={styles.dockContextMenuDivider} />
            </>
          )}
          {app.isRunning && (
            <div className={styles.dockContextMenuItem} onClick={handleQuit}>
              Quit {app.title}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
