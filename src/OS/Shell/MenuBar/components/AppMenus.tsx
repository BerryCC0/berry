"use client";

/**
 * AppMenus Component
 * Renders per-app menus from the focused app's AppNavigationConfig.menus,
 * plus a Window menu that lists all open windows.
 *
 * Per HIG-SPEC-DESKTOP §2:
 * - Per-app menus appear after the bold app name
 * - Window menu is always present when ≥1 window is open
 * - Keyboard shortcut hints shown right-aligned
 * - Disabled items at 50% opacity
 */

import { useCallback } from "react";
import { useWindowStore } from "@/OS/store/windowStore";
import { getAppConfig } from "@/OS/lib/AppLauncher";
import type { MenuDefinition, MenuItem } from "@/OS/types/app";

interface AppMenusProps {
  appId: string;
  activeMenu: string | null;
  onMenuClick: (menuId: string) => void;
  onClose: () => void;
  styles: Record<string, string>;
}

/** Format modifier keys for display (⌘, ⇧, ⌥, ⌃) */
function formatShortcut(shortcut?: string): string {
  if (!shortcut) return "";
  return shortcut
    .replace(/Cmd\+/gi, "⌘")
    .replace(/Shift\+/gi, "⇧")
    .replace(/Alt\+/gi, "⌥")
    .replace(/Ctrl\+/gi, "⌃");
}

export function AppMenus({
  appId,
  activeMenu,
  onMenuClick,
  onClose,
  styles,
}: AppMenusProps) {
  const appConfig = getAppConfig(appId);
  const menus = appConfig?.navigation?.menus;

  if (!menus || menus.length === 0) return null;

  return (
    <>
      {menus.map((menu) => (
        <MenuBarItem
          key={menu.id}
          menu={menu}
          isActive={activeMenu === `app-${menu.id}`}
          onClick={() => onMenuClick(`app-${menu.id}`)}
          onClose={onClose}
          styles={styles}
        />
      ))}
    </>
  );
}

/** Individual menu bar item with dropdown */
function MenuBarItem({
  menu,
  isActive,
  onClick,
  onClose,
  styles,
}: {
  menu: MenuDefinition;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
  styles: Record<string, string>;
}) {
  return (
    <div
      className={`${styles.menuItem} ${isActive ? styles.menuItemActive : ""}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-haspopup="menu"
      aria-expanded={isActive}
    >
      <span className={styles.menuLabel}>{menu.label}</span>
      {isActive && (
        <div
          className={styles.dropdown}
          onClick={(e) => e.stopPropagation()}
          role="menu"
        >
          {menu.items.map((item) =>
            item.separator ? (
              <div key={item.id} className={styles.dropdownDivider} />
            ) : (
              <MenuItemRow
                key={item.id}
                item={item}
                onClose={onClose}
                styles={styles}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

/** Single menu item row */
function MenuItemRow({
  item,
  onClose,
  styles,
}: {
  item: MenuItem;
  onClose: () => void;
  styles: Record<string, string>;
}) {
  const handleClick = useCallback(() => {
    if (item.disabled) return;
    // Emit a system event for the action so keyboard shortcuts can share logic
    // For now, just close the menu — actual action dispatch is wired in D4
    onClose();
  }, [item.disabled, onClose]);

  const className = [
    styles.dropdownItem,
    item.disabled ? styles.dropdownItemDisabled : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      onClick={handleClick}
      role="menuitem"
      aria-disabled={item.disabled}
    >
      <span>{item.label}</span>
      {item.shortcut && (
        <span className={styles.dropdownShortcut}>
          {formatShortcut(item.shortcut)}
        </span>
      )}
    </div>
  );
}

/**
 * WindowMenu Component
 * Always present when ≥1 window is open.
 * Lists: Minimize, Zoom, separator, Bring All to Front, separator, [open windows]
 */
export function WindowMenu({
  activeMenu,
  onMenuClick,
  onClose,
  styles,
}: {
  activeMenu: string | null;
  onMenuClick: (menuId: string) => void;
  onClose: () => void;
  styles: Record<string, string>;
}) {
  const windows = useWindowStore((state) => state.windows);
  const focusedWindowId = useWindowStore((state) => state.focusedWindowId);
  const focusWindow = useWindowStore((state) => state.focusWindow);
  const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
  const maximizeWindow = useWindowStore((state) => state.maximizeWindow);
  const restoreWindow = useWindowStore((state) => state.restoreWindow);

  const isActive = activeMenu === "window";
  const windowList = Array.from(windows.values());

  if (windowList.length === 0) return null;

  const handleMinimize = () => {
    if (focusedWindowId) minimizeWindow(focusedWindowId);
    onClose();
  };

  const handleZoom = () => {
    if (focusedWindowId) maximizeWindow(focusedWindowId);
    onClose();
  };

  const handleBringAllToFront = () => {
    // Focus each non-minimized window to bring them all forward
    windowList.forEach((w) => {
      if (w.isMinimized) restoreWindow(w.id);
    });
    onClose();
  };

  const handleFocusWindow = (windowId: string) => {
    const w = windows.get(windowId);
    if (w?.isMinimized) restoreWindow(windowId);
    focusWindow(windowId);
    onClose();
  };

  return (
    <div
      className={`${styles.menuItem} ${isActive ? styles.menuItemActive : ""}`}
      onClick={() => onMenuClick("window")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onMenuClick("window");
        }
      }}
      role="button"
      tabIndex={0}
      aria-haspopup="menu"
      aria-expanded={isActive}
    >
      <span className={styles.menuLabel}>Window</span>
      {isActive && (
        <div
          className={styles.dropdown}
          onClick={(e) => e.stopPropagation()}
          role="menu"
        >
          <div
            className={`${styles.dropdownItem} ${!focusedWindowId ? styles.dropdownItemDisabled : ""}`}
            onClick={handleMinimize}
            role="menuitem"
          >
            <span>Minimize</span>
            <span className={styles.dropdownShortcut}>⌘M</span>
          </div>
          <div
            className={`${styles.dropdownItem} ${!focusedWindowId ? styles.dropdownItemDisabled : ""}`}
            onClick={handleZoom}
            role="menuitem"
          >
            <span>Zoom</span>
          </div>
          <div className={styles.dropdownDivider} />
          <div
            className={styles.dropdownItem}
            onClick={handleBringAllToFront}
            role="menuitem"
          >
            <span>Bring All to Front</span>
          </div>
          {windowList.length > 0 && (
            <>
              <div className={styles.dropdownDivider} />
              {windowList.map((w) => (
                <div
                  key={w.id}
                  className={`${styles.dropdownItem} ${w.id === focusedWindowId ? styles.dropdownItemChecked : ""}`}
                  onClick={() => handleFocusWindow(w.id)}
                  role="menuitem"
                >
                  <span>{w.title}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
