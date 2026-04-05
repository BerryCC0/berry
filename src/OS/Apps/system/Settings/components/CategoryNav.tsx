"use client";

/**
 * CategoryNav Component
 *
 * Desktop (layout="list"): Scrollable list with icons in sidebar
 * Mobile (layout="grid"): Tappable card grid
 *
 * Icons are era-adaptive: each design era defines its own badge treatment
 * and glyph set. The active era is read from the settings store.
 * A 150ms crossfade smooths transitions when the user switches eras.
 */

import { useRef, useState, useEffect } from "react";
import { useSettingsStore } from "@/OS/store/settingsStore";
import { ERA_ICON_SETS, getIconColor } from "./icons";
import type { EraId } from "@/OS/types/settings";
import styles from "./CategoryNav.module.css";

export type CategoryId =
  | "appearance"
  | "desktop-dock"
  | "windows"
  | "notifications"
  | "privacy"
  | "accessibility";

export interface Category {
  id: CategoryId;
  label: string;
  description: string;
}

export const CATEGORIES: Category[] = [
  { id: "appearance", label: "Appearance", description: "Theme, era, dark mode, Nouns skin" },
  { id: "desktop-dock", label: "Desktop & Dock", description: "Wallpaper, icons, dock" },
  { id: "windows", label: "Windows", description: "Shadows, snapping, behavior" },
  { id: "notifications", label: "Notifications", description: "Alerts, sounds, position" },
  { id: "privacy", label: "Privacy & Data", description: "Wallet, data, ENS" },
  { id: "accessibility", label: "Accessibility", description: "Contrast, targets, focus" },
];

// ---------------------------------------------------------------------------
// Era-adaptive icon badge
// ---------------------------------------------------------------------------

function CategoryIcon({ id, size = "small" }: { id: CategoryId; size?: "small" | "large" }) {
  const era = useSettingsStore((s) => s.settings.appearance.era);
  const darkMode = useSettingsStore((s) => s.settings.appearance.darkMode);

  // Crossfade state — we render the "outgoing" era briefly during transition
  const [displayEra, setDisplayEra] = useState<EraId>(era);
  const [fading, setFading] = useState(false);
  const prevEra = useRef(era);

  useEffect(() => {
    if (era !== prevEra.current) {
      // Start fade out
      setFading(true);
      const timer = setTimeout(() => {
        setDisplayEra(era);
        setFading(false);
      }, 150);
      prevEra.current = era;
      return () => clearTimeout(timer);
    }
  }, [era]);

  const iconSet = ERA_ICON_SETS[displayEra];
  const dim = size === "large" ? 32 : 24;
  const color = getIconColor(displayEra, id);

  // Pick badge style (dark variant if available)
  const badgeFn = darkMode && iconSet.badgeDark ? iconSet.badgeDark : iconSet.badge;
  const badgeStyle = badgeFn(color, dim);

  // Pick glyph (large variant for grid if available)
  const glyphSet = size === "large" && iconSet.glyphsLarge ? iconSet.glyphsLarge : iconSet.glyphs;
  const Glyph = glyphSet[id];

  return (
    <span
      className={styles.iconBadge}
      style={{
        ...badgeStyle,
        opacity: fading ? 0 : 1,
        transition: "opacity 150ms ease",
      }}
      aria-hidden="true"
    >
      <Glyph />
    </span>
  );
}

// ---------------------------------------------------------------------------
// CategoryNav
// ---------------------------------------------------------------------------

interface CategoryNavProps {
  activeCategory: CategoryId | null;
  onSelect: (id: CategoryId) => void;
  layout: "list" | "grid";
}

export function CategoryNav({ activeCategory, onSelect, layout }: CategoryNavProps) {
  if (layout === "grid") {
    return (
      <div className={styles.grid}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={styles.gridCard}
            onClick={() => onSelect(cat.id)}
          >
            <CategoryIcon id={cat.id} size="large" />
            <span className={styles.gridLabel}>{cat.label}</span>
            <span className={styles.gridDesc}>{cat.description}</span>
          </button>
        ))}
      </div>
    );
  }

  // List layout (sidebar)
  return (
    <div className={styles.list}>
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          type="button"
          className={`${styles.listItem} ${activeCategory === cat.id ? styles.listItemActive : ""}`}
          onClick={() => onSelect(cat.id)}
        >
          <CategoryIcon id={cat.id} />
          <span className={styles.listLabel}>{cat.label}</span>
        </button>
      ))}
    </div>
  );
}
