"use client";

/**
 * Theme Editor Panel
 * Visual editor for creating custom themes with live preview
 */

import { useState, useCallback, useEffect } from "react";
import { SettingRow, SettingGroup } from "../components/SettingRow";
import { Button, ColorPicker, Select } from "../components/Controls";
import { useSettingsStore } from "@/OS/store/settingsStore";
import { BUILT_IN_THEMES } from "@/OS/lib/Settings/defaults";
import { applyThemeColors } from "@/OS/lib/Settings/applySettings";
import type { CustomTheme } from "@/OS/types/settings";
import styles from "./Panel.module.css";

// Color categories for organization
const COLOR_CATEGORIES = {
  backgrounds: [
    { key: "bgPrimary", label: "Primary Background" },
    { key: "bgSecondary", label: "Secondary Background" },
    { key: "bgTertiary", label: "Tertiary Background" },
  ],
  text: [
    { key: "textPrimary", label: "Primary Text" },
    { key: "textSecondary", label: "Secondary Text" },
    { key: "textMuted", label: "Muted Text" },
  ],
  accent: [
    { key: "accent", label: "Accent" },
    { key: "accentHover", label: "Accent Hover" },
    { key: "accentActive", label: "Accent Active" },
  ],
  window: [
    { key: "windowBg", label: "Window Background" },
    { key: "windowBorder", label: "Window Border" },
    { key: "titleBarBg", label: "Title Bar" },
    { key: "titleBarText", label: "Title Bar Text" },
  ],
  controls: [
    { key: "buttonBg", label: "Button Background" },
    { key: "buttonText", label: "Button Text" },
    { key: "inputBg", label: "Input Background" },
    { key: "inputBorder", label: "Input Border" },
  ],
  chrome: [
    { key: "dockBg", label: "Dock Background" },
    { key: "dockBorder", label: "Dock Border" },
    { key: "menuBarBg", label: "Menu Bar Background" },
    { key: "menuBarText", label: "Menu Bar Text" },
  ],
  semantic: [
    { key: "success", label: "Success" },
    { key: "warning", label: "Warning" },
    { key: "error", label: "Error" },
    { key: "info", label: "Info" },
  ],
} as const;

type ColorKey = keyof CustomTheme["colors"];

interface ThemeEditorPanelProps {
  onBack: () => void;
}

export function ThemeEditorPanel({ onBack }: ThemeEditorPanelProps) {
  const addCustomTheme = useSettingsStore((state) => state.addCustomTheme);
  const customThemes = useSettingsStore((state) => state.customThemes);
  const currentThemeId = useSettingsStore((state) => state.settings.appearance.themeId);
  const setSetting = useSettingsStore((state) => state.setSetting);

  // Start with current theme as base or first built-in
  const baseTheme = BUILT_IN_THEMES[currentThemeId as keyof typeof BUILT_IN_THEMES] 
    || customThemes.find(t => t.id === currentThemeId)
    || BUILT_IN_THEMES["berry-classic"];

  const [themeName, setThemeName] = useState("My Custom Theme");
  const [colors, setColors] = useState<CustomTheme["colors"]>({ ...baseTheme.colors });
  const [borderRadius, setBorderRadius] = useState<CustomTheme["borderRadius"]>(
    baseTheme.borderRadius || "small"
  );
  const [hasChanges, setHasChanges] = useState(false);

  // Apply live preview when colors change
  useEffect(() => {
    const previewTheme: CustomTheme = {
      id: "preview",
      name: themeName,
      colors,
      borderRadius,
    };
    applyThemeColors(previewTheme);
    setHasChanges(true);
  }, [colors, borderRadius, themeName]);

  // Update a single color
  const updateColor = useCallback((key: ColorKey, value: string) => {
    setColors((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Reset to base theme
  const handleReset = useCallback(() => {
    setColors({ ...baseTheme.colors });
    setBorderRadius(baseTheme.borderRadius || "small");
    setHasChanges(false);
  }, [baseTheme]);

  // Save custom theme
  const handleSave = useCallback(() => {
    const newTheme: CustomTheme = {
      id: `custom-${Date.now()}`,
      name: themeName,
      colors,
      borderRadius,
    };

    addCustomTheme(newTheme);
    setSetting("appearance", "themeId", newTheme.id);
    setHasChanges(false);
  }, [themeName, colors, borderRadius, addCustomTheme, setSetting]);

  // Export theme as JSON
  const handleExport = useCallback(() => {
    const theme: CustomTheme = {
      id: `exported-${Date.now()}`,
      name: themeName,
      colors,
      borderRadius,
    };
    const json = JSON.stringify(theme, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${themeName.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [themeName, colors, borderRadius]);

  // Import theme from JSON
  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const imported = JSON.parse(text) as CustomTheme;
        if (imported.colors) {
          setThemeName(imported.name || "Imported Theme");
          setColors(imported.colors);
          if (imported.borderRadius) {
            setBorderRadius(imported.borderRadius);
          }
        }
      } catch (err) {
        console.error("Failed to import theme:", err);
        alert("Invalid theme file");
      }
    };
    input.click();
  }, []);

  // Cancel and restore original theme
  const handleCancel = useCallback(() => {
    // Restore the original theme
    const originalTheme = BUILT_IN_THEMES[currentThemeId as keyof typeof BUILT_IN_THEMES]
      || customThemes.find(t => t.id === currentThemeId)
      || BUILT_IN_THEMES["berry-classic"];
    applyThemeColors(originalTheme);
    onBack();
  }, [currentThemeId, customThemes, onBack]);

  const borderRadiusOptions = [
    { value: "none", label: "None" },
    { value: "small", label: "Small (4px)" },
    { value: "medium", label: "Medium (8px)" },
    { value: "large", label: "Large (12px)" },
  ];

  return (
    <div className={styles.panel}>
      <div className={styles.editorHeader}>
        <button className={styles.backButton} onClick={handleCancel} type="button">
          ← Back
        </button>
        <h2 className={styles.title}>Theme Editor</h2>
      </div>

      <SettingGroup title="Theme Info">
        <SettingRow label="Theme Name">
          <input
            type="text"
            value={themeName}
            onChange={(e) => setThemeName(e.target.value)}
            className={styles.themeNameInput}
            placeholder="My Custom Theme"
          />
        </SettingRow>

        <SettingRow label="Border Radius" description="Corner roundness for UI elements">
          <Select
            value={borderRadius || "small"}
            options={borderRadiusOptions}
            onChange={(v) => setBorderRadius(v as CustomTheme["borderRadius"])}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Background Colors">
        {COLOR_CATEGORIES.backgrounds.map(({ key, label }) => (
          <SettingRow key={key} label={label}>
            <ColorPicker
              value={colors[key as ColorKey]}
              onChange={(v) => updateColor(key as ColorKey, v)}
            />
          </SettingRow>
        ))}
      </SettingGroup>

      <SettingGroup title="Text Colors">
        {COLOR_CATEGORIES.text.map(({ key, label }) => (
          <SettingRow key={key} label={label}>
            <ColorPicker
              value={colors[key as ColorKey]}
              onChange={(v) => updateColor(key as ColorKey, v)}
            />
          </SettingRow>
        ))}
      </SettingGroup>

      <SettingGroup title="Accent Colors">
        {COLOR_CATEGORIES.accent.map(({ key, label }) => (
          <SettingRow key={key} label={label}>
            <ColorPicker
              value={colors[key as ColorKey]}
              onChange={(v) => updateColor(key as ColorKey, v)}
            />
          </SettingRow>
        ))}
      </SettingGroup>

      <SettingGroup title="Window Chrome">
        {COLOR_CATEGORIES.window.map(({ key, label }) => (
          <SettingRow key={key} label={label}>
            {key === "titleBarBg" ? (
              <input
                type="text"
                value={colors[key as ColorKey]}
                onChange={(e) => updateColor(key as ColorKey, e.target.value)}
                className={styles.gradientInput}
                placeholder="linear-gradient(...) or #hex"
              />
            ) : (
              <ColorPicker
                value={colors[key as ColorKey]}
                onChange={(v) => updateColor(key as ColorKey, v)}
              />
            )}
          </SettingRow>
        ))}
      </SettingGroup>

      <SettingGroup title="Controls">
        {COLOR_CATEGORIES.controls.map(({ key, label }) => (
          <SettingRow key={key} label={label}>
            <ColorPicker
              value={colors[key as ColorKey]}
              onChange={(v) => updateColor(key as ColorKey, v)}
            />
          </SettingRow>
        ))}
      </SettingGroup>

      <SettingGroup title="System Chrome">
        {COLOR_CATEGORIES.chrome.map(({ key, label }) => (
          <SettingRow key={key} label={label}>
            {key === "dockBg" || key === "menuBarBg" ? (
              <input
                type="text"
                value={colors[key as ColorKey]}
                onChange={(e) => updateColor(key as ColorKey, e.target.value)}
                className={styles.gradientInput}
                placeholder="rgba(...) or #hex"
              />
            ) : (
              <ColorPicker
                value={colors[key as ColorKey]}
                onChange={(v) => updateColor(key as ColorKey, v)}
              />
            )}
          </SettingRow>
        ))}
      </SettingGroup>

      <SettingGroup title="Semantic Colors">
        {COLOR_CATEGORIES.semantic.map(({ key, label }) => (
          <SettingRow key={key} label={label}>
            <ColorPicker
              value={colors[key as ColorKey]}
              onChange={(v) => updateColor(key as ColorKey, v)}
            />
          </SettingRow>
        ))}
      </SettingGroup>

      <div className={styles.editorActions}>
        <div className={styles.actionGroup}>
          <Button variant="secondary" onClick={handleImport}>
            Import
          </Button>
          <Button variant="secondary" onClick={handleExport}>
            Export
          </Button>
        </div>
        <div className={styles.actionGroup}>
          <Button variant="secondary" onClick={handleReset}>
            Reset
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!hasChanges}>
            Save Theme
          </Button>
        </div>
      </div>
    </div>
  );
}

