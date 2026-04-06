/**
 * Settings Store
 * Zustand store for system settings with persistence support
 *
 * Includes migration logic for the old themeId → era + darkMode model.
 */

import { create } from "zustand";
import type { SystemSettings, CustomTheme, EraId } from "@/OS/types/settings";
import { DEFAULT_SETTINGS, migrateThemeId } from "@/OS/lib/Settings/defaults";

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

/**
 * Migrate legacy appearance settings (themeId + windowStyle) to
 * the new era + darkMode model.
 */
/** Valid era IDs — used to validate persisted values */
const VALID_ERAS: ReadonlySet<string> = new Set([
  "platinum", "aqua", "skeuomorphic", "flat", "big-sur", "liquid-glass",
]);

function isValidEra(value: unknown): value is EraId {
  return typeof value === "string" && VALID_ERAS.has(value);
}

function migrateAppearance(
  appearance: Record<string, unknown>
): SystemSettings["appearance"] {
  // Already migrated — has a *valid* `era` field and no legacy `themeId`
  if (isValidEra(appearance.era) && !appearance.themeId) {
    return appearance as unknown as SystemSettings["appearance"];
  }

  // Has legacy themeId — migrate
  if (appearance.themeId && typeof appearance.themeId === "string") {
    const migration = migrateThemeId(appearance.themeId as string);
    if (migration) {
      return {
        era: migration.era,
        darkMode: migration.darkMode,
        // Migrated users had an explicit toggle, so honor it instead of "auto"
        colorScheme: migration.darkMode ? "dark" as const : "light" as const,
        accentColor: (appearance.accentColor as string) ?? DEFAULT_SETTINGS.appearance.accentColor,
        wallpaper: (appearance.wallpaper as string) ?? DEFAULT_SETTINGS.appearance.wallpaper,
        desktopIconSize: (appearance.desktopIconSize as "small" | "medium" | "large") ?? DEFAULT_SETTINGS.appearance.desktopIconSize,
        fontSize: (appearance.fontSize as "small" | "default" | "large") ?? DEFAULT_SETTINGS.appearance.fontSize,
        reduceMotion: (appearance.reduceMotion as boolean) ?? DEFAULT_SETTINGS.appearance.reduceMotion,
        reduceTransparency: (appearance.reduceTransparency as boolean) ?? DEFAULT_SETTINGS.appearance.reduceTransparency,
      };
    }
  }

  // Fallback: if era is present and valid (partially migrated), use it
  if (isValidEra(appearance.era)) {
    return appearance as unknown as SystemSettings["appearance"];
  }

  // Full fallback — era missing or unrecognized
  return DEFAULT_SETTINGS.appearance;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  customThemes: [],
  isInitialized: false,

  initialize: (loadedSettings) => {
    if (get().isInitialized) return;

    let mergedSettings: SystemSettings;

    if (loadedSettings) {
      // Deep merge first, then migrate appearance
      const rawMerged = deepMerge(DEFAULT_SETTINGS, loadedSettings);

      // Migrate legacy appearance if needed
      const migratedAppearance = migrateAppearance(
        rawMerged.appearance as unknown as Record<string, unknown>
      );

      mergedSettings = {
        ...rawMerged,
        appearance: migratedAppearance,
      };
    } else {
      mergedSettings = DEFAULT_SETTINGS;
    }

    set({
      settings: mergedSettings,
      isInitialized: true,
    });

    if (process.env.NODE_ENV === "development") {
      console.log("[SettingsStore] Initialized with settings:", {
        era: mergedSettings.appearance.era,
        darkMode: mergedSettings.appearance.darkMode,
      });
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

      // Migrate appearance on import too
      const migratedAppearance = migrateAppearance(
        merged.appearance as unknown as Record<string, unknown>
      );

      set({
        settings: {
          ...merged,
          appearance: migratedAppearance,
        },
      });
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
 * Recursively merges source into target, handling all keys dynamically
 */
function deepMerge(
  target: SystemSettings,
  source: Partial<SystemSettings>
): SystemSettings {
  const result = { ...target };

  for (const key in source) {
    if (key in source) {
      const sourceValue = source[key as keyof SystemSettings];
      const targetValue = target[key as keyof SystemSettings];

      if (
        sourceValue &&
        targetValue &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue)
      ) {
        // Recursively merge nested objects
        result[key as keyof SystemSettings] = {
          ...(targetValue as unknown as Record<string, unknown>),
          ...(sourceValue as unknown as Record<string, unknown>),
        } as never;
      } else {
        // Use source value if available
        result[key as keyof SystemSettings] = sourceValue as never;
      }
    }
  }

  return result;
}
