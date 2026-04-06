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
import { AppMenus, WindowMenu } from "./components/AppMenus";
import { Clock } from "./components/Clock";
import { WalletButton } from "./components/WalletButton";
import desktopStyles from "./MenuBar.desktop.module.css";
import tabletStyles from "./MenuBar.tablet.module.css";
import mobileStyles from "./MenuBar.mobile.module.css";

export function MenuBar() {
  const platform = usePlatform();
  const isMobile = platform.type === "mobile" || platform.type === "farcaster";
  const isTablet = platform.type === "tablet";
  const styles = isMobile ? mobileStyles : isTablet ? tabletStyles : desktopStyles;

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Tablet auto-hide: menu bar is hidden by default, revealed on top-edge interaction
  const [isMenuBarRevealed, setIsMenuBarRevealed] = useState(!isTablet);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reveal on top-edge touch (within 20px of top)
  useEffect(() => {
    if (!isTablet) return;

    const handleTouch = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch && touch.clientY < 20) {
        setIsMenuBarRevealed(true);
        // Auto-hide after 3s of no interaction
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setIsMenuBarRevealed(false), 3000);
      }
    };

    // Also reveal on mouse hover at top edge (for trackpad users)
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY < 4) {
        setIsMenuBarRevealed(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setIsMenuBarRevealed(false), 3000);
      }
    };

    document.addEventListener("touchstart", handleTouch);
    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("touchstart", handleTouch);
      document.removeEventListener("mousemove", handleMouseMove);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isTablet]);

  // Keep revealed while a menu is open
  useEffect(() => {
    if (isTablet && activeMenu) {
      setIsMenuBarRevealed(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    }
  }, [isTablet, activeMenu]);

  // Derive focused app info — avoids subscribing to the full windows Map
  const currentAppName = useWindowStore((state) => {
    if (!state.focusedWindowId) return "Finder";
    return state.windows.get(state.focusedWindowId)?.title || "Finder";
  });

  const currentAppId = useWindowStore((state) => {
    if (!state.focusedWindowId) return "finder";
    return state.windows.get(state.focusedWindowId)?.appId || "finder";
  });

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
    <div className={`${styles.menuBar} ${isTablet && isMenuBarRevealed ? styles.menuBarVisible || "" : ""}`} ref={menuRef}>
      {/* Berry Menu */}
      <div
        className={`${styles.menuItem} ${styles.berryMenu} ${activeMenu === "berry" ? styles.menuItemActive : ""}`}
        onClick={() => handleMenuClick("berry")}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleMenuClick("berry"); } }}
        role="button"
        tabIndex={0}
        aria-label="Berry menu"
        aria-expanded={activeMenu === "berry"}
        aria-haspopup="menu"
      >
        <img
          src={getIcon("berry")}
          alt=""
          className={styles.berryIcon}
          aria-hidden="true"
        />
        {activeMenu === "berry" && (
          <BerryMenu onClose={handleCloseMenus} styles={styles} />
        )}
      </div>

      {/* App Name */}
      <div className={`${styles.menuItem} ${styles.appName}`}>
        <span className={styles.menuLabel}>{currentAppName}</span>
      </div>

      {/* Per-app menus (desktop only — tablet uses title bar actions instead) */}
      {!isMobile && !isTablet && (
        <AppMenus
          appId={currentAppId}
          activeMenu={activeMenu}
          onMenuClick={handleMenuClick}
          onClose={handleCloseMenus}
          styles={styles}
        />
      )}

      {/* Window menu (desktop only) */}
      {!isMobile && !isTablet && (
        <WindowMenu
          activeMenu={activeMenu}
          onMenuClick={handleMenuClick}
          onClose={handleCloseMenus}
          styles={styles}
        />
      )}

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
