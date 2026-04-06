"use client";

/**
 * NavigationBar Component
 * iOS-style navigation bar for mobile shell.
 *
 * Per HIG-SPEC-MOBILE §3:
 * - Standard mode (44px): title centered, back button left, trailing actions right
 * - Large title mode (96px): 34px bold title below button row
 * - Large title collapses on scroll, expands when scrolled to top
 * - Back button when stack depth > 1
 * - 0–2 trailing action buttons from app config
 */

import { useCallback, useEffect, useState } from "react";
import { usePlatform } from "@/OS/lib/PlatformDetection";
import { useTabStore, type NavigationScreen } from "@/OS/store/tabStore";
import { getAppConfig } from "@/OS/lib/AppLauncher";
import { systemBus } from "@/OS/lib/EventBus";
import type { ToolbarItem } from "@/OS/types/app";
import styles from "./NavigationBar.module.css";

/** Action icon map — SF Symbol names to unicode/emoji */
const ACTION_ICON_MAP: Record<string, string> = {
  "plus": "+",
  "plus.circle": "⊕",
  "line.3.horizontal.decrease": "☰",
  "slider.horizontal.3": "☰",
  "square.and.arrow.up": "↗",
  "gearshape": "⚙",
  "magnifyingglass": "🔍",
  "ellipsis": "⋯",
  "bell": "🔔",
};

function getActionIcon(iconName: string): string {
  return ACTION_ICON_MAP[iconName] || iconName.charAt(0).toUpperCase();
}

export function NavigationBar() {
  const platform = usePlatform();
  const isMobile = platform.type === "mobile";
  const isFarcaster = platform.type === "farcaster";

  const activeTab = useTabStore((state) => state.activeTab);
  const stacks = useTabStore((state) => state.stacks);
  const isInitialized = useTabStore((state) => state.isInitialized);
  const pop = useTabStore((state) => state.pop);
  const getCurrentScreen = useTabStore((state) => state.getCurrentScreen);
  const getDepth = useTabStore((state) => state.getDepth);

  const [isScrolled, setIsScrolled] = useState(false);
  const [isLargeTitleCollapsed, setIsLargeTitleCollapsed] = useState(false);

  // Only render on mobile/farcaster
  if ((!isMobile && !isFarcaster) || !isInitialized) return null;

  const currentScreen = getCurrentScreen();
  const depth = getDepth();

  // Determine previous screen title for back button label
  const stack = stacks.get(activeTab);
  const previousScreen = stack && stack.length > 1 ? stack[stack.length - 2] : null;
  const backLabel = previousScreen ? previousScreen.title : "";

  // Get trailing toolbar items from the current app's config
  const appConfig = currentScreen ? getAppConfig(currentScreen.appId) : null;
  const toolbarItems = appConfig?.navigation?.toolbarItems?.filter(
    (item: ToolbarItem) => item.position === "trailing"
  )?.slice(0, 2) || [];

  // Farcaster: no large title, no Berry branding (§9)
  const useLargeTitle = isFarcaster ? false : (currentScreen?.largeTitleEnabled ?? false);

  const handleBack = () => {
    pop();
  };

  const handleAction = (item: ToolbarItem) => {
    if (currentScreen) {
      systemBus.emit("app:shortcut", {
        appId: currentScreen.appId,
        action: item.action,
        windowId: null,
      });
    }
  };

  const barClassName = [
    styles.navigationBar,
    isScrolled ? styles.navigationBarScrolled : "",
  ]
    .filter(Boolean)
    .join(" ");

  const largeTitleClassName = [
    styles.largeTitleRow,
    isLargeTitleCollapsed || !useLargeTitle ? styles.largeTitleCollapsed : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={barClassName}>
      {/* Standard row — always visible */}
      <div className={styles.navRow}>
        {/* Back button */}
        {depth > 1 ? (
          <button
            className={styles.backButton}
            onClick={handleBack}
            aria-label={`Back to ${backLabel || "previous"}`}
          >
            <span className={styles.backChevron}>‹</span>
            <span className={styles.backLabel}>
              {backLabel.length > 12 ? backLabel.slice(0, 12) + "…" : backLabel}
            </span>
          </button>
        ) : (
          <div style={{ width: 8 }} />
        )}

        {/* Title (hidden when large title is showing) */}
        <span
          className={[
            styles.navTitle,
            useLargeTitle && !isLargeTitleCollapsed ? styles.navTitleHidden : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {currentScreen?.title || ""}
        </span>

        {/* Trailing actions */}
        <div className={styles.trailingActions}>
          {toolbarItems.map((item: ToolbarItem) => (
            <button
              key={item.id}
              className={styles.actionButton}
              onClick={() => handleAction(item)}
              aria-label={item.label}
              disabled={item.disabled}
            >
              {getActionIcon(item.icon)}
            </button>
          ))}
        </div>
      </div>

      {/* Large title row — collapses on scroll */}
      <div className={largeTitleClassName}>
        <span className={styles.largeTitleText}>
          {currentScreen?.title || ""}
        </span>
      </div>
    </header>
  );
}
