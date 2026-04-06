"use client";

/**
 * TitleBar Component
 * Era-aware window title bar / unified toolbar.
 *
 * Legacy eras (System 1 → Flat): 22px classic strip — [traffic lights][centered title]
 * Modern eras (Big Sur, Liquid Glass): 52px unified toolbar — [leading][center][trailing]
 *   Collapses to 28px compact if the app declares no toolbar items AND no dynamic toolbar.
 *   Title is NOT rendered visually in modern eras — it's metadata only (aria-label, Window menu).
 *
 * Portal system (dynamic toolbars):
 *   When an app sets `dynamicToolbar: true` in its navigation config, the title bar
 *   renders empty portal-target <div>s inside each slot. The app's <Toolbar> component
 *   (from ToolbarContext) portals its own React content into these targets, giving each
 *   view full control over what appears in the toolbar — search bars, segmented controls,
 *   action buttons, etc.
 */

import type { ToolbarItem } from "@/OS/types/app";
import type { EraId } from "@/OS/types/settings";

/** Eras that use the modern unified toolbar layout */
const MODERN_ERAS: ReadonlySet<string> = new Set(["big-sur", "liquid-glass"]);

export interface TitleBarProps {
  title: string;
  isFocused: boolean;
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  styles: Record<string, string>;
  isMobile: boolean;
  // Era-aware props
  era?: EraId;
  toolbarItems?: ToolbarItem[];
  hasSidebar?: boolean;
  sidebarWidth?: number;
  isContentScrolled?: boolean;
  // Dynamic toolbar props
  dynamicToolbar?: boolean;
  portalRefs?: {
    setLeadingRef: (node: HTMLDivElement | null) => void;
    setCenterRef: (node: HTMLDivElement | null) => void;
    setTrailingRef: (node: HTMLDivElement | null) => void;
  };
}

/** Traffic light buttons — shared between legacy and modern layouts */
function TrafficLights({
  styles,
  isMobile,
  onClose,
  onMinimize,
  onMaximize,
}: {
  styles: Record<string, string>;
  isMobile: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
}) {
  return (
    <div className={styles.windowControls}>
      <button
        className={`${styles.controlButton} ${styles.closeButton}`}
        onClick={onClose}
        aria-label="Close window"
      >
        {isMobile ? "×" : ""}
      </button>
      <button
        className={`${styles.controlButton} ${styles.minimizeButton}`}
        onClick={onMinimize}
        aria-label="Minimize window"
      >
        {isMobile ? "−" : ""}
      </button>
      <button
        className={`${styles.controlButton} ${styles.maximizeButton}`}
        onClick={onMaximize}
        aria-label="Maximize window"
      >
        {isMobile ? "+" : ""}
      </button>
    </div>
  );
}

export function TitleBar({
  title,
  isFocused,
  onDragStart,
  onClose,
  onMinimize,
  onMaximize,
  styles,
  isMobile,
  era,
  toolbarItems,
  hasSidebar,
  sidebarWidth,
  isContentScrolled,
  dynamicToolbar,
  portalRefs,
}: TitleBarProps) {
  const isModern = era ? MODERN_ERAS.has(era) : false;
  const hasToolbarItems = toolbarItems && toolbarItems.length > 0;
  // Full height if there are static toolbar items OR the app uses dynamic toolbar
  const useFullHeight = hasToolbarItems || dynamicToolbar;

  // Double-click title bar to maximize
  const handleDoubleClick = (e: React.MouseEvent) => {
    // Only maximize if double-clicking the draggable area (not controls or toolbar items)
    if (
      !(e.target as HTMLElement).closest(`.${styles.windowControls}`) &&
      !(e.target as HTMLElement).closest(`.${styles.toolbarAction}`) &&
      !(e.target as HTMLElement).closest('[data-toolbar-portal]')
    ) {
      onMaximize();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag if not clicking on controls, toolbar items, or portaled content
    if (
      !(e.target as HTMLElement).closest(`.${styles.windowControls}`) &&
      !(e.target as HTMLElement).closest(`.${styles.toolbarAction}`) &&
      !(e.target as HTMLElement).closest('[data-toolbar-interactive]')
    ) {
      onDragStart(e);
    }
  };

  // ──────────────────────────────────────────────
  // Modern unified toolbar (Big Sur, Liquid Glass)
  // ──────────────────────────────────────────────
  if (isModern && !isMobile) {
    const centerItems = toolbarItems?.filter((i) => i.position === "center") ?? [];
    const trailingItems = toolbarItems?.filter((i) => i.position === "trailing") ?? [];

    const toolbarClassName = [
      styles.titleBar,
      styles.titleBarModern,
      useFullHeight ? styles.titleBarFull : styles.titleBarCompact,
      isFocused ? styles.titleBarFocused : "",
      isContentScrolled ? styles.titleBarScrolled : "",
      hasSidebar ? styles.titleBarSidebar : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div
        className={toolbarClassName}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        role="toolbar"
        aria-label={title}
        style={hasSidebar && sidebarWidth ? { ["--sidebar-width" as string]: `${sidebarWidth}px` } : undefined}
      >
        {/* Leading slot: traffic lights + portal target */}
        <div className={styles.toolbarLeading}>
          <TrafficLights
            styles={styles}
            isMobile={false}
            onClose={onClose}
            onMinimize={onMinimize}
            onMaximize={onMaximize}
          />
          {portalRefs && (
            <div
              ref={portalRefs.setLeadingRef}
              data-toolbar-portal="leading"
              style={{ display: "contents" }}
            />
          )}
        </div>

        {/* Center slot: portal target + static items */}
        <div className={styles.toolbarCenter} data-toolbar-center>
          {portalRefs && (
            <div
              ref={portalRefs.setCenterRef}
              data-toolbar-portal="center"
              style={{ display: "contents" }}
            />
          )}
          {/* Static toolbar items (only rendered if app doesn't use dynamic toolbar) */}
          {!dynamicToolbar && centerItems.map((item) => (
            <button
              key={item.id}
              className={styles.toolbarAction}
              aria-label={item.label}
              title={item.label}
              disabled={item.disabled}
            >
              <span className={styles.toolbarActionIcon}>{item.icon}</span>
              <span className={styles.toolbarActionLabel}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Trailing slot: portal target + static items */}
        <div className={styles.toolbarTrailing}>
          {portalRefs && (
            <div
              ref={portalRefs.setTrailingRef}
              data-toolbar-portal="trailing"
              style={{ display: "contents" }}
            />
          )}
          {/* Static toolbar items (only rendered if app doesn't use dynamic toolbar) */}
          {!dynamicToolbar && trailingItems.map((item) => (
            <button
              key={item.id}
              className={styles.toolbarAction}
              aria-label={item.label}
              title={item.label}
              disabled={item.disabled}
            >
              <span className={styles.toolbarActionIcon}>{item.icon}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // Legacy title bar (System 1 → Flat, and mobile)
  // ──────────────────────────────────────────────
  const titleBarClassName = [
    styles.titleBar,
    styles.titleBarLegacy,
    isFocused ? styles.titleBarFocused : "",
  ]
    .filter(Boolean)
    .join(" ");

  const titleTextClassName = [
    styles.titleText,
    !isFocused ? styles.titleTextBlurred : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={titleBarClassName}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      role="toolbar"
      aria-label={title}
    >
      <TrafficLights
        styles={styles}
        isMobile={isMobile}
        onClose={onClose}
        onMinimize={onMinimize}
        onMaximize={onMaximize}
      />
      <span className={titleTextClassName}>{title}</span>
    </div>
  );
}
