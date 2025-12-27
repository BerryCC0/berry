"use client";

/**
 * Window Component
 * Mac OS 8 style window with title bar, controls, and resize handles
 * Respects settings for shadows and window style.
 */

import { useCallback, type ReactNode } from "react";
import { usePlatform } from "@/OS/lib/PlatformDetection";
import { useWindowStore } from "@/OS/store/windowStore";
import { useSettingsStore } from "@/OS/store/settingsStore";
import { appLauncher } from "@/OS/lib/AppLauncher";
import type { WindowState } from "@/OS/types/window";
import { TitleBar } from "./components/TitleBar";
import { useWindowDrag } from "./hooks/useWindowDrag";
import { useWindowResize } from "./hooks/useWindowResize";
import desktopStyles from "./Window.desktop.module.css";
import mobileStyles from "./Window.mobile.module.css";

interface WindowProps {
  windowId: string;
  children: ReactNode;
}

export function Window({ windowId, children }: WindowProps) {
  const platform = usePlatform();
  const isMobile = platform.type === "mobile" || platform.type === "farcaster";
  const styles = isMobile ? mobileStyles : desktopStyles;

  const window = useWindowStore((state) => state.windows.get(windowId));
  const focusWindow = useWindowStore((state) => state.focusWindow);
  const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
  const maximizeWindow = useWindowStore((state) => state.maximizeWindow);

  // Settings - window shadows and style
  const showShadows = useSettingsStore((state) => state.settings.windows.showShadows);
  const windowStyle = useSettingsStore((state) => state.settings.appearance.windowStyle);

  const { handleDragStart, isDragging } = useWindowDrag(windowId);
  const { handleResizeStart, isResizing, resizeHandles } = useWindowResize(windowId);

  const handleWindowClick = useCallback(() => {
    focusWindow(windowId);
  }, [focusWindow, windowId]);

  // Use appLauncher.close to properly clean up runningInstances tracking
  const handleClose = useCallback(() => {
    appLauncher.close(windowId);
  }, [windowId]);

  const handleMinimize = useCallback(() => {
    minimizeWindow(windowId);
  }, [minimizeWindow, windowId]);

  const handleMaximize = useCallback(() => {
    maximizeWindow(windowId);
  }, [maximizeWindow, windowId]);

  if (!window || window.isMinimized) {
    return null;
  }

  return (
    <WindowRenderer
      window={window}
      styles={styles}
      isMobile={isMobile}
      isDragging={isDragging}
      isResizing={isResizing}
      showShadows={showShadows}
      windowStyleSetting={windowStyle}
      onWindowClick={handleWindowClick}
      onDragStart={handleDragStart}
      onClose={handleClose}
      onMinimize={handleMinimize}
      onMaximize={handleMaximize}
      resizeHandles={resizeHandles}
      handleResizeStart={handleResizeStart}
    >
      {children}
    </WindowRenderer>
  );
}

interface WindowRendererProps {
  window: WindowState;
  styles: Record<string, string>;
  isMobile: boolean;
  isDragging: boolean;
  isResizing: boolean;
  showShadows: boolean;
  windowStyleSetting: "classic" | "modern";
  onWindowClick: () => void;
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  resizeHandles: string[];
  handleResizeStart: (edge: string, e: React.MouseEvent) => void;
  children: ReactNode;
}

function WindowRenderer({
  window,
  styles,
  isMobile,
  isDragging,
  isResizing,
  showShadows,
  windowStyleSetting,
  onWindowClick,
  onDragStart,
  onClose,
  onMinimize,
  onMaximize,
  resizeHandles,
  handleResizeStart,
  children,
}: WindowRendererProps) {
  const windowClassName = [
    styles.window,
    window.isFocused ? styles.windowFocused : styles.windowBlurred,
    isDragging ? styles.windowDragging : "",
    isResizing ? styles.windowResizing : "",
    !showShadows ? styles.windowNoShadow : "",
    windowStyleSetting === "modern" ? styles.windowModern : styles.windowClassic,
  ]
    .filter(Boolean)
    .join(" ");

  // Mobile windows are fullscreen
  const windowStyle = isMobile
    ? {}
    : {
        left: window.x,
        top: window.y,
        width: window.width,
        height: window.height,
        zIndex: window.zIndex,
      };

  return (
    <div
      className={windowClassName}
      style={windowStyle}
      onMouseDown={onWindowClick}
    >
      <TitleBar
        title={window.title}
        isFocused={window.isFocused}
        onDragStart={onDragStart}
        onClose={onClose}
        onMinimize={onMinimize}
        onMaximize={onMaximize}
        styles={styles}
        isMobile={isMobile}
      />

      <div className={styles.content}>{children}</div>

      {/* Resize handles (desktop only) */}
      {!isMobile &&
        window.isResizable &&
        resizeHandles.map((edge) => (
          <div
            key={edge}
            className={`${styles.resizeHandle} ${styles[`resizeHandle${edge.toUpperCase()}`]}`}
            onMouseDown={(e) => handleResizeStart(edge, e)}
          />
        ))}
    </div>
  );
}

