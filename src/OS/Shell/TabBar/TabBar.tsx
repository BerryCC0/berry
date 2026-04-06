"use client";

/**
 * TabBar Component
 * iOS-style tab bar for mobile shell.
 *
 * Per HIG-SPEC-MOBILE §2:
 * - 5 tabs max (4 app tabs + More)
 * - 49px + safe-area-inset-bottom
 * - Glass material background (era-aware)
 * - Tap active tab → popToRoot
 * - Badge support for notifications
 */

import { useEffect } from "react";
import { usePlatform } from "@/OS/lib/PlatformDetection";
import { useTabStore } from "@/OS/store/tabStore";
import styles from "./TabBar.module.css";

/** Map SF Symbol names to emoji/unicode for quick rendering */
const ICON_MAP: Record<string, string> = {
  "house.fill": "⌂",
  "building.columns": "⚖",
  "magnifyingglass": "🔍",
  "bubble.left.and.bubble.right.fill": "💬",
  "ellipsis.circle": "⋯",
};

function getTabIcon(iconName: string): string {
  return ICON_MAP[iconName] || "●";
}

export function TabBar() {
  const platform = usePlatform();
  const isMobile = platform.type === "mobile";
  const isFarcaster = platform.type === "farcaster";

  const tabs = useTabStore((state) => state.tabs);
  const activeTab = useTabStore((state) => state.activeTab);
  const isInitialized = useTabStore((state) => state.isInitialized);
  const initialize = useTabStore((state) => state.initialize);
  const switchTab = useTabStore((state) => state.switchTab);

  // Initialize tabs on mount
  useEffect(() => {
    if (!isInitialized && (isMobile || isFarcaster)) {
      initialize();
    }
  }, [isInitialized, isMobile, isFarcaster, initialize]);

  // Only render on mobile, never on Farcaster (§9: no tab bar in miniapps)
  if (!isMobile || !isInitialized) return null;

  const barClassName = [
    styles.tabBar,
    isFarcaster ? styles.tabBarHidden : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <nav className={barClassName} role="tablist" aria-label="Main navigation">
      {tabs.map((tab) => {
        const isSelected = tab.id === activeTab;
        const itemClassName = [
          styles.tabItem,
          isSelected ? styles.tabItemSelected : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <button
            key={tab.id}
            className={itemClassName}
            role="tab"
            aria-selected={isSelected}
            aria-label={tab.label}
            onClick={() => switchTab(tab.id)}
          >
            <span className={styles.tabIcon}>
              {getTabIcon(tab.icon)}
            </span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
