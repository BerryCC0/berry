"use client";

/**
 * Appearance Settings Panel
 */

import { useState } from "react";
import { SettingRow, SettingGroup } from "../components/SettingRow";
import { Toggle, Select, ColorPicker, Button } from "../components/Controls";
import { useSettingsStore } from "@/OS/store/settingsStore";
import { useTranslation } from "@/OS/lib/i18n";
import {
  BUILT_IN_THEMES,
  ACCENT_COLORS,
  WALLPAPERS,
} from "@/OS/lib/Settings/defaults";
import type { AppearanceSettings } from "@/OS/types/settings";
import { ThemeEditorPanel } from "./ThemeEditorPanel";
import styles from "./Panel.module.css";

/** Convert WALLPAPERS to ColorPicker preset format */
const WALLPAPER_PRESETS = WALLPAPERS.map((wp) => ({
  name: wp.name,
  value: wp.value,
}));

/** Check if a value is a color (hex) or URL */
function isColor(value: string): boolean {
  return value.startsWith("#") || value.startsWith("rgb");
}

/** WallpaperPicker - Color presets + custom URL input */
function WallpaperPicker({
  value,
  presets,
  onChange,
}: {
  value: string;
  presets: { name: string; value: string }[];
  onChange: (value: string) => void;
}) {
  // Check if current value is a preset or a custom URL/color
  const isPreset = presets.some((p) => p.value === value);
  
  // Track local input state for custom URLs
  const [customInput, setCustomInput] = useState(() => {
    // Initialize with current value if it's a custom URL (not a preset, not a hex color)
    if (value && !isPreset && !value.startsWith("#")) {
      return value;
    }
    return "";
  });

  const handleCustomSubmit = () => {
    const trimmed = customInput.trim();
    if (trimmed) {
      onChange(trimmed);
    }
  };

  return (
    <div className={styles.wallpaperPicker}>
      <div className={styles.colorSwatches}>
        {presets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className={`${styles.colorSwatch} ${value === preset.value ? styles.colorSwatchActive : ""}`}
            style={{ background: preset.value }}
            onClick={() => {
              onChange(preset.value);
              setCustomInput(""); // Clear custom input when preset is selected
            }}
            title={preset.name}
            aria-label={preset.name}
          />
        ))}
      </div>
      <div className={styles.customUrlRow}>
        <input
          type="text"
          className={styles.customUrlInput}
          placeholder="Custom image URL..."
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleCustomSubmit();
            }
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

export function AppearancePanel() {
  const { t } = useTranslation();
  const [showEditor, setShowEditor] = useState(false);
  const appearance = useSettingsStore((state) => state.settings.appearance);
  const customThemes = useSettingsStore((state) => state.customThemes);
  const setSetting = useSettingsStore((state) => state.setSetting);
  const resetCategory = useSettingsStore((state) => state.resetCategory);

  const handleChange = <K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K]
  ) => {
    setSetting("appearance", key, value);
  };

  // Combine built-in and custom themes
  const themeOptions = [
    ...Object.values(BUILT_IN_THEMES).map((theme) => ({
      value: theme.id,
      label: theme.name,
    })),
    ...customThemes.map((theme) => ({
      value: theme.id,
      label: `${theme.name} (Custom)`,
    })),
  ];

  // Show theme editor if requested
  if (showEditor) {
    return <ThemeEditorPanel onBack={() => setShowEditor(false)} />;
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>{t('settings.appearance.title')}</h2>

      <SettingGroup title={t('settings.appearance.theme')}>
        <SettingRow label={t('settings.appearance.theme')} description={t('settings.appearance.themeDescription')}>
          <Select
            value={appearance.themeId}
            options={themeOptions}
            onChange={(value) => handleChange("themeId", value)}
          />
        </SettingRow>

        <SettingRow label={t('settings.appearance.accentColor')} description={t('settings.appearance.accentColorDescription')}>
          <ColorPicker
            value={appearance.accentColor}
            presets={ACCENT_COLORS}
            onChange={(value) => handleChange("accentColor", value)}
          />
        </SettingRow>

        <SettingRow label={t('settings.appearance.windowStyle')}>
          <Select
            value={appearance.windowStyle}
            options={[
              { value: "classic", label: t('settings.appearance.classic') },
              { value: "modern", label: t('settings.appearance.modern') },
            ]}
            onChange={(value) => handleChange("windowStyle", value)}
          />
        </SettingRow>

        <SettingRow
          label={t('settings.appearance.createCustomTheme')}
          description={t('settings.appearance.createCustomThemeDescription')}
        >
          <Button onClick={() => setShowEditor(true)}>
            {t('settings.appearance.openEditor')}
          </Button>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title={t('settings.appearance.desktop')}>
        <SettingRow label={t('settings.appearance.wallpaper')} description={t('settings.appearance.wallpaperDescription')}>
          <WallpaperPicker
            value={appearance.wallpaper}
            presets={WALLPAPER_PRESETS}
            onChange={(value) => handleChange("wallpaper", value)}
          />
        </SettingRow>

        <SettingRow label={t('settings.appearance.desktopIconSize')}>
          <Select
            value={appearance.desktopIconSize}
            options={[
              { value: "small", label: t('settings.appearance.small') },
              { value: "medium", label: t('settings.appearance.medium') },
              { value: "large", label: t('settings.appearance.large') },
            ]}
            onChange={(value) => handleChange("desktopIconSize", value)}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title={t('settings.appearance.display')}>
        <SettingRow label={t('settings.appearance.fontSize')} description={t('settings.appearance.fontSizeDescription')}>
          <Select
            value={appearance.fontSize}
            options={[
              { value: "small", label: t('settings.appearance.small') },
              { value: "default", label: t('settings.appearance.default') },
              { value: "large", label: t('settings.appearance.large') },
            ]}
            onChange={(value) => handleChange("fontSize", value)}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title={t('settings.appearance.effects')}>
        <SettingRow
          label={t('settings.appearance.reduceMotion')}
          description={t('settings.appearance.reduceMotionDescription')}
        >
          <Toggle
            checked={appearance.reduceMotion}
            onChange={(checked) => handleChange("reduceMotion", checked)}
          />
        </SettingRow>

        <SettingRow
          label={t('settings.appearance.reduceTransparency')}
          description={t('settings.appearance.reduceTransparencyDescription')}
        >
          <Toggle
            checked={appearance.reduceTransparency}
            onChange={(checked) => handleChange("reduceTransparency", checked)}
          />
        </SettingRow>
      </SettingGroup>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => resetCategory("appearance")}>
          {t('settings.appearance.resetToDefaults')}
        </Button>
      </div>
    </div>
  );
}

