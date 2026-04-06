"use client";

/**
 * Window Component
 * Era-aware window with title bar, controls, resize handles,
 * and dynamic toolbar portal support.
 */

import { useCallback, useMemo, type ReactNode } from "react";
import { usePlatform } from "@/OS/lib/PlatformDetection";
import { useWindowStore } from "@/OS/store/windowStore";
import { useSettingsStore } from "@/OS/store/settingsStore";
import { appLauncher, getAppConfig } from "@/OS/lib/AppLauncher";
import type { WindowState } from "@/OS/types/window";
import type { ToolbarItem } from "@/OS/types/app";
import type { EraId } from "@/OS/types/settings";
import { TitleBar } from "./components/TitleBar";
import {
  useToolbarPortalTargets,
  ToolbarPortalProvider,
} from "./ToolbarContext";
import { useWindowDrag } from "./hooks/useWindowDrag";
import { useWindowResize } from "./hooks/useWindowResize";
import desktopStyles from "./Window.desktop.module.css";
import tabletStyles from "./Window.tablet.module.css";
import mobileStyles from "./Window.mobile.module.css";

/** Eras that use the modern unified toolbar layout (must match TitleBar) */
const MODERN_ERAS: ReadonlySet<string> = new Set(["big-sur", "liquid-glass"]);

interface WindowProps {
  windowId: string;
  children: ReactNode;
}

export function Window({ windowId, children }: WindowProps) {
  const platform = usePlatform();
  const isMobile = platform.type === "mobile" || platform.type === "farcaster";
  const isTablet = platform.type === "tablet";
  const styles = isMobile ? mobileStyles : isTablet ? tabletStyles : desktopStyles;

  const window = useWindowStore((state) => state.windows.get(windowId));
  const focusWindow = useWindowStore((state) => state.focusWindow);
  const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
  const maximizeWindow = useWindowStore((state) => state.maximizeWindow);

  // Settings - window shadows and style
  const showShadows = useSettingsStore((state) => state.settings.windows.showShadows);
  // Derive window style from era (replaces old windowStyle setting)
  const era = useSettingsStore((state) => state.settings.appearance.era);

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
      windowStyleSetting={era}
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
  windowStyleSetting: EraId;
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
  // Resolve app's navigation config for toolbar items
  const appConfig = getAppConfig(window.appId);
  const navigation = appConfig?.navigation;

  // Dynamic toolbar portal system
  const { targets, setLeadingRef, setCenterRef, setTrailingRef } =
    useToolbarPortalTargets();

  const isModern = MODERN_ERAS.has(windowStyleSetting) && !isMobile;

  const portalRefs = useMemo(
    () => ({ setLeadingRef, setCenterRef, setTrailingRef }),
    [setLeadingRef, setCenterRef, setTrailingRef],
  );

  const windowClassName = [
    styles.window,
    window.isFocused ? styles.windowFocused : styles.windowBlurred,
    isDragging ? styles.windowDragging : "",
    isResizing ? styles.windowResizing : "",
    !showShadows ? styles.windowNoShadow : "",
    // Modern eras (flat, big-sur, liquid-glass) use rounded window style
    ["flat", "big-sur", "liquid-glass"].includes(windowStyleSetting)
      ? styles.windowModern
      : styles.windowClassic,
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
        era={windowStyleSetting}
        toolbarItems={navigation?.toolbarItems}
        hasSidebar={navigation?.hasSidebar}
        dynamicToolbar={navigation?.dynamicToolbar}
        portalRefs={portalRefs}
      />

      <div className={styles.content}>
        <ToolbarPortalProvider targets={targets} isModern={isModern}>
          {children}
        </ToolbarPortalProvider>
      </div>

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
