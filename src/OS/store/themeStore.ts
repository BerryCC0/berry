/**
 * Theme Store
 * Manages theming and visual customization
 * 
 * Per ARCHITECTURE.md, emits theme:changed and theme:property-changed events
 */

import { create } from "zustand";
import type { Theme } from "@/OS/types/theme";
import { CLASSIC_THEME } from "@/OS/types/theme";
import { systemBus } from "@/OS/lib/EventBus";

interface ThemeStore {
  // State
  currentTheme: Theme;
  customThemes: Theme[];

  // Actions
  setTheme: (theme: Theme) => void;
  updateThemeProperty: <T>(path: string, value: T) => void;
  addCustomTheme: (theme: Theme) => void;
  removeCustomTheme: (themeId: string) => void;
  resetToDefault: () => void;
}

/**
 * Helper to set nested property by path
 * Validates that intermediate path values are objects before spreading
 */
function setNestedProperty<T extends object>(
  obj: T,
  path: string,
  value: unknown
): T {
  const keys = path.split(".");
  const result = { ...obj } as Record<string, unknown>;
  let current = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const currentValue = current[key];

    // Validate that intermediate value is an object, not a primitive
    if (currentValue !== null && currentValue !== undefined && typeof currentValue !== "object") {
      console.warn(
        `[themeStore] Cannot set nested property "${path}": intermediate path "${keys.slice(0, i + 1).join(".")}" is not an object (got ${typeof currentValue})`
      );
      return obj;
    }

    current[key] = { ...(currentValue as object) };
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return result as T;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  // Initial state
  currentTheme: CLASSIC_THEME,
  customThemes: [],

  // Actions
  setTheme: (theme: Theme) => {
    set({ currentTheme: theme });
    
    // Emit event for other systems to react
    systemBus.emit("theme:changed", { theme });
  },

  updateThemeProperty: <T>(path: string, value: T) => {
    const { currentTheme } = get();
    let updatedTheme = setNestedProperty(currentTheme, path, value);

    // Mark as custom if modifying a preset theme, using spread to avoid mutation
    if (updatedTheme.preset !== "custom") {
      updatedTheme = {
        ...updatedTheme,
        preset: "custom",
        id: `custom-${Date.now()}`,
        name: `${updatedTheme.name} (Custom)`,
      };
    }

    set({ currentTheme: updatedTheme });

    // Emit property-level event for fine-grained updates
    systemBus.emit("theme:property-changed", { path, value });

    // Also emit full theme change
    systemBus.emit("theme:changed", { theme: updatedTheme });
  },

  addCustomTheme: (theme: Theme) => {
    set((state) => ({
      customThemes: [...state.customThemes, theme],
    }));
  },

  removeCustomTheme: (themeId: string) => {
    set((state) => ({
      customThemes: state.customThemes.filter((t) => t.id !== themeId),
    }));
  },

  resetToDefault: () => {
    set({ currentTheme: CLASSIC_THEME });
    
    // Emit event for theme reset
    systemBus.emit("theme:changed", { theme: CLASSIC_THEME });
  },
}));
