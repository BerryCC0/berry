/**
 * Settings Store
 * Zustand store for system settings with persistence support
 */

import { create } from "zustand";
import type { SystemSettings, CustomTheme } from "@/OS/types/settings";
import { DEFAULT_SETTINGS } from "@/OS/lib/Settings/defaults";

interface SettingsStore {
  settings: SystemSettings;
  customThemes: CustomTheme[];
  isInitialized: boolean;

  // Initialize with loaded or default settings
  initialize: (loadedSettings?: Partial<SystemSettings>) => void;

  // Update a single setting within a category
  setSetting: <K extends keyof SystemSettings>(
    category: K,
    key: keyof SystemSettings[K],
    value: SystemSettings[K][keyof SystemSettings[K]]
  ) => void;

  // Update entire category
  setCategory: <K extends keyof SystemSettings>(
    category: K,
    values: Partial<SystemSettings[K]>
  ) => void;

  // Replace all settings (for import)
  setSettings: (settings: SystemSettings) => void;

  // Reset to defaults
  resetSettings: () => void;
  resetCategory: (category: keyof SystemSettings) => void;

  // Export/import
  exportSettings: () => string;
  importSettings: (json: string) => boolean;

  // Custom themes
  addCustomTheme: (theme: CustomTheme) => void;
  updateCustomTheme: (theme: CustomTheme) => void;
  deleteCustomTheme: (themeId: string) => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  customThemes: [],
  isInitialized: false,

  initialize: (loadedSettings) => {
    if (get().isInitialized) return;

    const mergedSettings = loadedSettings
      ? deepMerge(DEFAULT_SETTINGS, loadedSettings)
      : DEFAULT_SETTINGS;

    set({
      settings: mergedSettings,
      isInitialized: true,
    });

    if (process.env.NODE_ENV === "development") {
      console.log("[SettingsStore] Initialized with settings");
    }
  },

  setSetting: (category, key, value) => {
    set((state) => ({
      settings: {
        ...state.settings,
        [category]: {
          ...state.settings[category],
          [key]: value,
        },
      },
    }));
  },

  setCategory: (category, values) => {
    set((state) => ({
      settings: {
        ...state.settings,
        [category]: {
          ...state.settings[category],
          ...values,
        },
      },
    }));
  },

  setSettings: (settings) => {
    set({ settings });
  },

  resetSettings: () => {
    set({ settings: DEFAULT_SETTINGS });
  },

  resetCategory: (category) => {
    set((state) => ({
      settings: {
        ...state.settings,
        [category]: DEFAULT_SETTINGS[category],
      },
    }));
  },

  exportSettings: () => {
    return JSON.stringify(get().settings, null, 2);
  },

  importSettings: (json) => {
    try {
      const imported = JSON.parse(json) as Partial<SystemSettings>;
      const merged = deepMerge(DEFAULT_SETTINGS, imported);
      set({ settings: merged });
      return true;
    } catch (error) {
      console.error("[SettingsStore] Failed to import settings:", error);
      return false;
    }
  },

  addCustomTheme: (theme) => {
    set((state) => ({
      customThemes: [...state.customThemes, theme],
    }));
  },

  updateCustomTheme: (theme) => {
    set((state) => ({
      customThemes: state.customThemes.map((t) =>
        t.id === theme.id ? theme : t
      ),
    }));
  },

  deleteCustomTheme: (themeId) => {
    set((state) => ({
      customThemes: state.customThemes.filter((t) => t.id !== themeId),
    }));
  },
}));

/**
 * Deep merge utility for settings objects
 */
function deepMerge(
  target: SystemSettings,
  source: Partial<SystemSettings>
): SystemSettings {
  return {
    appearance: { ...target.appearance, ...source.appearance },
    desktop: { ...target.desktop, ...source.desktop },
    windows: { ...target.windows, ...source.windows },
    notifications: { ...target.notifications, ...source.notifications },
    privacy: { ...target.privacy, ...source.privacy },
    accessibility: { ...target.accessibility, ...source.accessibility },
  };
}

