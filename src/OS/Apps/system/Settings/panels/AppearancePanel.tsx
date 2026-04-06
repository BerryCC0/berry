"use client";

/**
 * Appearance Settings Panel
 *
 * Layout (top to bottom):
 *   1. Dark Mode toggle
 *   2. Era Selection: 7 visual card grid
 *   3. Accent Color: swatch row + custom picker
 *   4. Wallpaper: hero preview + swatch grid + custom URL
 */

import { useState } from "react";
import { useShallow } from "zustand/shallow";
import { SettingRow, SettingGroup } from "../components/SettingRow";
import { Toggle, ColorPicker, Button } from "../components/Controls";
import { useSettingsStore } from "@/OS/store/settingsStore";
import {
  ERA_THEMES,
  ACCENT_COLORS,
  WALLPAPERS,
  WALLPAPER_CATEGORIES,
  type WallpaperPreset,
  type WallpaperCategory,
} from "@/OS/lib/Settings/defaults";
import type { AppearanceSettings, EraId } from "@/OS/types/settings";
import styles from "./Panel.module.css";

// ---------------------------------------------------------------------------
// Era display metadata
// ---------------------------------------------------------------------------

interface EraInfo {
  id: EraId;
  label: string;
  year: string;
  trait: string;
}

const ERAS: EraInfo[] = [
  { id: "platinum", label: "Platinum", year: "1997", trait: "The classic Mac" },
  { id: "aqua", label: "Aqua", year: "2001", trait: "Lickable UI" },
  { id: "skeuomorphic", label: "Rich & Real", year: "2007", trait: "Textures & depth" },
  { id: "flat", label: "Clarity", year: "2013", trait: "Content-first" },
  { id: "big-sur", label: "Big Sur", year: "2020", trait: "Rounded modern" },
  { id: "liquid-glass", label: "Liquid Glass", year: "2025", trait: "Glass & light" },
];

// ---------------------------------------------------------------------------
// WallpaperSection — Hero preview + swatch grid
// ---------------------------------------------------------------------------

function WallpaperSection({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  // Default to whichever category the current wallpaper belongs to
  const currentCat = WALLPAPERS.find((wp) => wp.value === value)?.category ?? "landscape";
  const [activeTab, setActiveTab] = useState(currentCat);

  const [customInput, setCustomInput] = useState(() => {
    const isPreset = WALLPAPERS.some((wp) => wp.value === value);
    if (value && !isPreset) return value;
    return "";
  });

  const handleCustomSubmit = () => {
    const trimmed = customInput.trim();
    if (trimmed) onChange(trimmed);
  };

  const isGradient = value.startsWith("linear-gradient") || value.startsWith("radial-gradient");
  const isColor = value.startsWith("#") || value.startsWith("rgb");
  const heroStyle: React.CSSProperties = isGradient
    ? { backgroundImage: value }
    : isColor
    ? { backgroundColor: value }
    : { backgroundImage: `url(${value})`, backgroundSize: "cover", backgroundPosition: "center" };

  const visiblePresets = WALLPAPERS.filter((wp) => wp.category === activeTab);

  return (
    <div className={styles.wallpaperSection}>
      <div className={styles.wallpaperHero} style={heroStyle} />

      {/* Category tabs */}
      <div className={styles.wallpaperTabs}>
        {WALLPAPER_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`${styles.wallpaperTab} ${activeTab === cat.id ? styles.wallpaperTabActive : ""}`}
            onClick={() => setActiveTab(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Swatches for active category */}
      <div className={styles.wallpaperSwatches}>
        {visiblePresets.map((wp) => (
          <WallpaperSwatch
            key={wp.value}
            preset={wp}
            active={value === wp.value}
            onClick={() => {
              onChange(wp.value);
              setCustomInput("");
            }}
          />
        ))}
      </div>

      {/* Custom URL input */}
      <div className={styles.customUrlRow}>
        <input
          type="text"
          className={styles.customUrlInput}
          placeholder="Image URL or CSS gradient..."
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCustomSubmit();
          }}
        />
        <button
          type="button"
          className={styles.customUrlButton}
          onClick={handleCustomSubmit}
          disabled={!customInput.trim()}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

function WallpaperSwatch({
  preset,
  active,
  onClick,
}: {
  preset: WallpaperPreset;
  active: boolean;
  onClick: () => void;
}) {
  const isGradient = preset.value.startsWith("linear-gradient") || preset.value.startsWith("radial-gradient");
  const style: React.CSSProperties = isGradient
    ? { backgroundImage: preset.value }
    : { backgroundColor: preset.value };

  return (
    <button
      type="button"
      className={`${styles.wallpaperSwatch} ${active ? styles.wallpaperSwatchActive : ""}`}
      style={style}
      onClick={onClick}
      title={preset.name}
      aria-label={preset.name}
    />
  );
}

// ---------------------------------------------------------------------------
// Era Card — visual preview of an era
// ---------------------------------------------------------------------------

function EraCard({
  era,
  darkMode,
  isActive,
  onClick,
}: {
  era: EraInfo;
  darkMode: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  const eraThemes = ERA_THEMES[era.id] ?? ERA_THEMES["liquid-glass"];
  const theme = darkMode ? eraThemes.dark : eraThemes.light;
  const c = theme.colors;
  const isRounded = theme.borderRadius === "large" || theme.borderRadius === "medium";

  return (
    <button
      type="button"
      className={`${styles.eraCard} ${isActive ? styles.eraCardActive : ""}`}
      onClick={onClick}
    >
      {/* Mini window preview */}
      <div
        className={styles.eraPreview}
        style={{
          background: c.bgPrimary,
          borderRadius: isRounded ? "6px" : "1px",
          border: `1px solid ${c.windowBorder || "rgba(0,0,0,0.15)"}`,
        }}
      >
        {/* Title bar */}
        <div
          style={{
            height: "8px",
            background:
              typeof c.titleBarBg === "string" && c.titleBarBg.startsWith("linear")
                ? c.titleBarBg
                : c.titleBarBg || c.bgSecondary,
            borderRadius: isRounded ? "5px 5px 0 0" : "0",
            borderBottom: `1px solid ${c.windowBorder || "rgba(0,0,0,0.1)"}`,
          }}
        />
        {/* Content area */}
        <div style={{ flex: 1, padding: "3px" }}>
          <div
            style={{
              height: "3px",
              width: "60%",
              background: c.textPrimary,
              opacity: 0.3,
              borderRadius: "1px",
              marginBottom: "2px",
            }}
          />
          <div
            style={{
              height: "3px",
              width: "40%",
              background: c.textPrimary,
              opacity: 0.2,
              borderRadius: "1px",
            }}
          />
        </div>
        {/* Dock */}
        <div
          style={{
            height: "5px",
            margin: "0 4px 2px",
            background: c.dockBg || c.bgSecondary,
            borderRadius: isRounded ? "2px" : "0",
            opacity: 0.7,
          }}
        />
      </div>
      {/* Label */}
      <span className={styles.eraLabel}>{era.label}</span>
      <span className={styles.eraYear}>{era.year}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// AppearancePanel
// ---------------------------------------------------------------------------

export function AppearancePanel() {
  const appearance = useSettingsStore(
    useShallow((state) => state.settings.appearance)
  );
  const setSetting = useSettingsStore((state) => state.setSetting);
  const setCategory = useSettingsStore((state) => state.setCategory);
  const resetCategory = useSettingsStore((state) => state.resetCategory);

  const handleChange = <K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K]
  ) => {
    setSetting("appearance", key, value);
  };

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Appearance</h2>

      {/* ── 1. Dark Mode Toggle ── */}
      <SettingGroup title="Mode">
        <SettingRow label="Dark Mode" description="Light or dark variant of the current era">
          <Toggle
            checked={appearance.darkMode}
            onChange={(checked) => handleChange("darkMode", checked)}
          />
        </SettingRow>
      </SettingGroup>

      {/* ── 2. Era Selection — Visual Card Grid ── */}
      <SettingGroup title="Design Era">
        <div className={styles.eraGrid}>
          {ERAS.map((era) => (
            <EraCard
              key={era.id}
              era={era}
              darkMode={appearance.darkMode}
              isActive={appearance.era === era.id}
              onClick={() => setCategory("appearance", { era: era.id })}
            />
          ))}
        </div>
      </SettingGroup>

      {/* ── 3. Accent Color ── */}
      <SettingGroup title="Accent Color">
        <SettingRow label="Accent Color" description="System-wide highlight color">
          <ColorPicker
            value={appearance.accentColor}
            presets={ACCENT_COLORS}
            onChange={(value) => handleChange("accentColor", value)}
          />
        </SettingRow>
      </SettingGroup>

      {/* ── 4. Wallpaper ── */}
      <SettingGroup title="Wallpaper">
        <WallpaperSection
          value={appearance.wallpaper}
          onChange={(value) => handleChange("wallpaper", value)}
        />
      </SettingGroup>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => resetCategory("appearance")}>
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
