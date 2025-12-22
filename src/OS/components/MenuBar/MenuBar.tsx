"use client";

/**
 * MenuBar Component
 * Mac OS 8 style menu bar with Berry menu, app menus, and status area
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { usePlatform } from "@/OS/lib/PlatformDetection";
import { useWindowStore } from "@/OS/store/windowStore";
import { getIcon } from "@/OS/lib/IconRegistry";
import { BerryMenu } from "./components/BerryMenu";
import { Clock } from "./components/Clock";
import { WalletButton } from "./components/WalletButton";
import desktopStyles from "./MenuBar.desktop.module.css";
import mobileStyles from "./MenuBar.mobile.module.css";

export function MenuBar() {
  const platform = usePlatform();
  const isMobile = platform.type === "mobile" || platform.type === "farcaster";
  const styles = isMobile ? mobileStyles : desktopStyles;

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const focusedWindowId = useWindowStore((state) => state.focusedWindowId);
  const windows = useWindowStore((state) => state.windows);

  // Get the focused window's app name for the menu
  const focusedWindow = focusedWindowId ? windows.get(focusedWindowId) : null;
  const currentAppName = focusedWindow?.title || "Finder";

  const handleMenuClick = useCallback((menuId: string) => {
    setActiveMenu((prev) => (prev === menuId ? null : menuId));
  }, []);

  const handleCloseMenus = useCallback(() => {
    setActiveMenu(null);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    if (!activeMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };

    // Use capture phase to ensure we catch the click before it's stopped
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeMenu]);

  // Close menu on Escape key
  useEffect(() => {
    if (!activeMenu) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveMenu(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeMenu]);

  return (
    <div className={styles.menuBar}>
      {/* Berry Menu */}
      <div
        ref={menuRef}
        className={`${styles.menuItem} ${styles.berryMenu} ${activeMenu === "berry" ? styles.menuItemActive : ""}`}
        onClick={() => handleMenuClick("berry")}
      >
        <img 
          src={getIcon("berry")} 
          alt="Berry" 
          className={styles.berryIcon} 
        />
        {activeMenu === "berry" && (
          <BerryMenu onClose={handleCloseMenus} styles={styles} />
        )}
      </div>

      {/* App Name */}
      <div className={`${styles.menuItem} ${styles.appName}`}>
        <span className={styles.menuLabel}>{currentAppName}</span>
      </div>

      {/* Spacer */}
      <div className={styles.spacer} />

      {/* Status Area */}
      <div className={styles.statusArea}>
        {/* Wallet Connection */}
        <WalletButton styles={styles} />

        {/* Clock */}
        <Clock styles={styles} />
      </div>
    </div>
  );
}
