"use client";

/**
 * System Settings App — Redesigned
 *
 * Desktop (≥768px): Two-column split view (240px nav + scrollable content)
 * Mobile (<768px): Single-column drill-down (category grid → panel)
 *
 * 6 categories (merged from 8): Appearance, Desktop & Dock, Windows,
 * Notifications, Privacy & Data, Accessibility.
 * About → footer link, Language → footer dropdown.
 */

import { useState, useEffect } from "react";
import type { AppComponentProps } from "@/OS/types/app";
import { useSettingsStore } from "@/OS/store/settingsStore";
import { usePlatform } from "@/OS/lib/PlatformDetection";
import {
  AppearancePanel,
  WindowsPanel,
  NotificationsPanel,
  PrivacyPanel,
  AccessibilityPanel,
} from "./panels";
import { DesktopDockPanel } from "./panels/DesktopDockPanel";
import { CategoryNav, type CategoryId, CATEGORIES } from "./components/CategoryNav";
import { AboutPopover } from "./components/AboutPopover";
import styles from "./Settings.module.css";

export function Settings({ initialState }: AppComponentProps) {
  const initState = initialState as { section?: CategoryId } | undefined;
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(
    initState?.section || "appearance"
  );
  const [showAbout, setShowAbout] = useState(false);

  const platform = usePlatform();
  const isMobile = platform.type === "mobile" || platform.type === "farcaster";

  const isInitialized = useSettingsStore((state) => state.isInitialized);
  const initialize = useSettingsStore((state) => state.initialize);

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  const handleCategorySelect = (id: CategoryId) => {
    setActiveCategory(id);
  };

  const handleBack = () => {
    setActiveCategory(null);
  };

  const renderPanel = () => {
    switch (activeCategory) {
      case "appearance":
        return <AppearancePanel />;
      case "desktop-dock":
        return <DesktopDockPanel />;
      case "windows":
        return <WindowsPanel />;
      case "notifications":
        return <NotificationsPanel />;
      case "privacy":
        return <PrivacyPanel />;
      case "accessibility":
        return <AccessibilityPanel />;
      default:
        return <AppearancePanel />;
    }
  };

  // Mobile: drill-down layout
  if (isMobile) {
    // If no category selected, show the grid
    if (!activeCategory) {
      return (
        <div className={styles.container}>
          <div className={styles.mobileHeader}>
            <h1 className={styles.mobileTitle}>Settings</h1>
          </div>
          <CategoryNav
            activeCategory={null}
            onSelect={handleCategorySelect}
            layout="grid"
          />
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.footerLink}
              onClick={() => setShowAbout(true)}
            >
              About Berry OS
            </button>
          </div>
          {showAbout && <AboutPopover onClose={() => setShowAbout(false)} />}
        </div>
      );
    }

    // Category selected: show panel with back button
    const category = CATEGORIES.find((c) => c.id === activeCategory);
    return (
      <div className={styles.container}>
        <div className={styles.mobileHeader}>
          <button type="button" className={styles.backButton} onClick={handleBack}>
            ← Back
          </button>
          <h1 className={styles.mobileTitle}>{category?.label || "Settings"}</h1>
        </div>
        <div className={styles.panelContent}>
          {renderPanel()}
        </div>
      </div>
    );
  }

  // Desktop: two-column layout
  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.headerTitle}>Settings</span>
        </div>
        <CategoryNav
          activeCategory={activeCategory}
          onSelect={handleCategorySelect}
          layout="list"
        />
        <div className={styles.sidebarFooter}>
          <button
            type="button"
            className={styles.footerLink}
            onClick={() => setShowAbout(true)}
          >
            About Berry OS
          </button>
        </div>
      </div>
      <main className={styles.content}>
        {renderPanel()}
      </main>
      {showAbout && <AboutPopover onClose={() => setShowAbout(false)} />}
    </div>
  );
}
