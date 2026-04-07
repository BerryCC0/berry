/**
 * Settings Defaults
 * Default values for all system settings
 *
 * The theme system uses 7 eras, each with light and dark variants.
 * getActiveTheme() resolves (era, darkMode) → CustomTheme.
 */

import type {
  SystemSettings,
  CustomTheme,
  EraId,
} from "@/OS/types/settings";

// ---------------------------------------------------------------------------
// Default system settings
// ---------------------------------------------------------------------------

export const DEFAULT_SETTINGS: SystemSettings = {
  appearance: {
    era: "liquid-glass",
    darkMode: true,
    colorScheme: "auto", // Follow OS preference by default
    accentColor: "#E93737", // Nouns Red
    wallpaper: "#E1D7D5", // Nouns Warm
    desktopIconSize: "medium",
    fontSize: "default",
    reduceMotion: false,
    reduceTransparency: false,
  },

  desktop: {
    showIcons: true,
    iconGridSize: "normal",
    desktopApps: ["finder"], // Default desktop icons (Macintosh HD)
    dockPosition: "bottom",
    dockAutoHide: false,
    menuPinnedApps: ["finder", "calculator"], // Default pinned apps
  },

  windows: {
    showShadows: true,
    snapToEdges: true,
    snapThreshold: 20,
    rememberPositions: true,
    maxOpenWindows: 20,
  },

  notifications: {
    enabled: true,
    position: "top-right",
    duration: 5000,
    soundEffects: false,
  },

  privacy: {
    rememberWallet: true,
    clearDataOnDisconnect: false,
    ensResolution: true,
  },

  accessibility: {
    highContrast: false,
    largeClickTargets: false,
    keyboardNavigation: true,
    screenReaderHints: true,
    focusIndicators: "default",
  },
};

// =========================================================================
// ERA THEMES — 7 eras, each with light + dark variants
// =========================================================================

export interface EraThemes {
  light: CustomTheme;
  dark: CustomTheme;
}

export const ERA_THEMES: Record<EraId, EraThemes> = {
  // ── Platinum (Mac OS 8–9, 1997) — Beveled 3D, metallic grays ──
  platinum: {
    light: {
      id: "platinum",
      name: "Platinum",
      era: "platinum",
      colors: {
        bgPrimary: "#E0E0E0",
        bgSecondary: "#C0C0C0",
        bgTertiary: "#F0F0F0",
        textPrimary: "#000000",
        textSecondary: "#333333",
        textMuted: "#808080",
        accent: "#E93737",
        accentHover: "#D62F2F",
        accentActive: "#C22727",
        windowBg: "#E0E0E0",
        windowBorder: "#808080",
        titleBarBg: "linear-gradient(180deg, #E8E8E8 0%, #C0C0C0 100%)",
        titleBarText: "#000000",
        buttonBg: "linear-gradient(180deg, #F0F0F0 0%, #D0D0D0 100%)",
        buttonText: "#000000",
        inputBg: "#FFFFFF",
        inputBorder: "#808080",
        dockBg: "#E0E0E0",
        dockBorder: "#808080",
        menuBarBg: "#E0E0E0",
        menuBarText: "#000000",
        success: "#008000",
        warning: "#CC8800",
        error: "#CC0000",
        info: "#0066CC",
      },
      borderRadius: "none",
      windowChrome: {
        titleBarHeight: 22,
        trafficLightStyle: "boxes",
        trafficLightSize: 12,
        borderStyle: "bevel-outset",
        shadowStyle: "hard",
        resizeHandleStyle: "lines",
      },
      dock: {
        style: "shelf",
        backdropBlur: 0,
        magnification: false,
        reflections: false,
      },
      animations: {
        transitionDuration: 0,
        easing: "linear",
        enableBounce: false,
        enableGenie: false,
      },
    },
    dark: {
      id: "platinum-dark",
      name: "Platinum Dark",
      era: "platinum",
      colors: {
        bgPrimary: "#404040",
        bgSecondary: "#333333",
        bgTertiary: "#4A4A4A",
        textPrimary: "#E0E0E0",
        textSecondary: "#B0B0B0",
        textMuted: "#808080",
        accent: "#E93737",
        accentHover: "#FF4545",
        accentActive: "#D62F2F",
        windowBg: "#404040",
        windowBorder: "#606060",
        titleBarBg: "linear-gradient(180deg, #4A4A4A 0%, #333333 100%)",
        titleBarText: "#E0E0E0",
        buttonBg: "linear-gradient(180deg, #4A4A4A 0%, #383838 100%)",
        buttonText: "#E0E0E0",
        inputBg: "#333333",
        inputBorder: "#606060",
        dockBg: "#404040",
        dockBorder: "#606060",
        menuBarBg: "#404040",
        menuBarText: "#E0E0E0",
        success: "#28A745",
        warning: "#FFC107",
        error: "#DC3545",
        info: "#17A2B8",
      },
      borderRadius: "none",
      windowChrome: {
        titleBarHeight: 22,
        trafficLightStyle: "boxes",
        trafficLightSize: 12,
        borderStyle: "bevel-outset",
        shadowStyle: "hard",
        resizeHandleStyle: "lines",
      },
      dock: {
        style: "shelf",
        backdropBlur: 0,
        magnification: false,
        reflections: false,
      },
    },
  },

  // ── Aqua (Mac OS X, 2001) — Gel buttons, pinstripes, Lucida Grande ──
  aqua: {
    light: {
      id: "aqua",
      name: "Aqua",
      era: "aqua",
      colors: {
        bgPrimary: "#E8E8E8",
        bgSecondary: "#D9D9D9",
        bgTertiary: "#F0F0F0",
        textPrimary: "#000000",
        textSecondary: "#555555",
        textMuted: "#999999",
        accent: "#2B6EFF",
        accentHover: "#1E5AD4",
        accentActive: "#1048AA",
        windowBg: "#E8E8E8",
        windowBorder: "transparent",
        titleBarBg: "linear-gradient(180deg, #E8E8E8 0%, #CCCCCC 100%)",
        titleBarText: "#4A4A4A",
        buttonBg: "linear-gradient(180deg, #FFFFFF 0%, #CCCCCC 50%, #B8B8B8 100%)",
        buttonText: "#000000",
        inputBg: "#FFFFFF",
        inputBorder: "#B0B0B0",
        dockBg: "linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2))",
        dockBorder: "rgba(255,255,255,0.5)",
        menuBarBg: "rgba(232,232,232,0.85)",
        menuBarText: "#000000",
        success: "#28C940",
        warning: "#FFBD2E",
        error: "#FF5F57",
        info: "#2B6EFF",
      },
      borderRadius: "small",
      windowChrome: {
        titleBarHeight: 22,
        trafficLightStyle: "circles-gel",
        trafficLightSize: 12,
        borderStyle: "none",
        shadowStyle: "soft",
        resizeHandleStyle: "lines",
      },
      dock: {
        style: "glass",
        backdropBlur: 10,
        magnification: true,
        reflections: true,
      },
      animations: {
        transitionDuration: 150,
        easing: "ease-out",
        enableBounce: true,
        enableGenie: true,
      },
    },
    dark: {
      id: "aqua-dark",
      name: "Aqua Dark",
      era: "aqua",
      colors: {
        bgPrimary: "#2D2D2D",
        bgSecondary: "#1E1E1E",
        bgTertiary: "#3A3A3A",
        textPrimary: "#E0E0E0",
        textSecondary: "#AAAAAA",
        textMuted: "#777777",
        accent: "#4D8BFF",
        accentHover: "#6BA0FF",
        accentActive: "#2B6EFF",
        windowBg: "#2D2D2D",
        windowBorder: "transparent",
        titleBarBg: "linear-gradient(180deg, #3A3A3A 0%, #2D2D2D 100%)",
        titleBarText: "#CCCCCC",
        buttonBg: "linear-gradient(180deg, #4A4A4A 0%, #3A3A3A 50%, #333333 100%)",
        buttonText: "#E0E0E0",
        inputBg: "#1E1E1E",
        inputBorder: "#555555",
        dockBg: "linear-gradient(180deg, rgba(60,60,60,0.6), rgba(40,40,40,0.2))",
        dockBorder: "rgba(255,255,255,0.15)",
        menuBarBg: "rgba(45,45,45,0.85)",
        menuBarText: "#E0E0E0",
        success: "#28C940",
        warning: "#FFBD2E",
        error: "#FF5F57",
        info: "#4D8BFF",
      },
      borderRadius: "small",
      windowChrome: {
        titleBarHeight: 22,
        trafficLightStyle: "circles-gel",
        trafficLightSize: 12,
        borderStyle: "none",
        shadowStyle: "soft",
        resizeHandleStyle: "lines",
      },
      dock: {
        style: "glass",
        backdropBlur: 10,
        magnification: true,
        reflections: true,
      },
    },
  },

  // ── Skeuomorphic (2010–2013) — Rich textures, warm linen, Helvetica Neue ──
  skeuomorphic: {
    light: {
      id: "skeuomorphic",
      name: "Rich & Real",
      era: "skeuomorphic",
      colors: {
        bgPrimary: "#EFEBE5",
        bgSecondary: "#E0DCD6",
        bgTertiary: "#D6D2CC",
        textPrimary: "#1A1A1A",
        textSecondary: "#555555",
        textMuted: "#999999",
        accent: "#007AFF",
        accentHover: "#0066DD",
        accentActive: "#0055BB",
        windowBg: "#EFEBE5",
        windowBorder: "#B0A898",
        titleBarBg: "linear-gradient(180deg, #E8E4DE 0%, #D6D2CC 100%)",
        titleBarText: "#333333",
        buttonBg: "linear-gradient(180deg, #FEFEFE 0%, #D8D8D8 50%, #C8C8C8 100%)",
        buttonText: "#333333",
        inputBg: "#FFFFFF",
        inputBorder: "#B0A898",
        dockBg: "linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2))",
        dockBorder: "rgba(255,255,255,0.5)",
        menuBarBg: "rgba(239,235,229,0.92)",
        menuBarText: "#1A1A1A",
        success: "#28C940",
        warning: "#FFBD2E",
        error: "#FF5F57",
        info: "#007AFF",
      },
      borderRadius: "small",
      windowChrome: {
        titleBarHeight: 22,
        trafficLightStyle: "circles-gel",
        trafficLightSize: 12,
        borderStyle: "solid",
        shadowStyle: "soft",
        resizeHandleStyle: "lines",
      },
      dock: {
        style: "glass",
        backdropBlur: 10,
        magnification: true,
        reflections: true,
      },
      animations: {
        transitionDuration: 200,
        easing: "ease-out",
        enableBounce: true,
        enableGenie: true,
      },
    },
    dark: {
      id: "skeuomorphic-dark",
      name: "Rich & Real Dark",
      era: "skeuomorphic",
      colors: {
        bgPrimary: "#2A2520",
        bgSecondary: "#1E1A16",
        bgTertiary: "#36302A",
        textPrimary: "#E8E4DE",
        textSecondary: "#B0A898",
        textMuted: "#7A7068",
        accent: "#0A84FF",
        accentHover: "#409CFF",
        accentActive: "#007AFF",
        windowBg: "#2A2520",
        windowBorder: "#4A4238",
        titleBarBg: "linear-gradient(180deg, #36302A 0%, #2A2520 100%)",
        titleBarText: "#D6D2CC",
        buttonBg: "linear-gradient(180deg, #3E3830 0%, #2E2822 50%, #262018 100%)",
        buttonText: "#D6D2CC",
        inputBg: "#1E1A16",
        inputBorder: "#4A4238",
        dockBg: "linear-gradient(180deg, rgba(60,55,48,0.6), rgba(40,35,30,0.2))",
        dockBorder: "rgba(255,255,255,0.1)",
        menuBarBg: "rgba(42,37,32,0.92)",
        menuBarText: "#E8E4DE",
        success: "#30D158",
        warning: "#FF9F0A",
        error: "#FF453A",
        info: "#0A84FF",
      },
      borderRadius: "small",
      windowChrome: {
        titleBarHeight: 22,
        trafficLightStyle: "circles-gel",
        trafficLightSize: 12,
        borderStyle: "solid",
        shadowStyle: "soft",
        resizeHandleStyle: "lines",
      },
      dock: {
        style: "glass",
        backdropBlur: 10,
        magnification: true,
        reflections: true,
      },
    },
  },

  // ── Flat (iOS 7 / Yosemite, 2013) — Content-first, translucent, SF Pro ──
  flat: {
    light: {
      id: "flat",
      name: "Clarity",
      era: "flat",
      colors: {
        bgPrimary: "#FFFFFF",
        bgSecondary: "#F5F5F5",
        bgTertiary: "#EBEBEB",
        textPrimary: "#000000",
        textSecondary: "#8E8E93",
        textMuted: "#C7C7CC",
        accent: "#007AFF",
        accentHover: "#0066DD",
        accentActive: "#0055BB",
        windowBg: "#FFFFFF",
        windowBorder: "transparent",
        titleBarBg: "#FFFFFF",
        titleBarText: "#000000",
        buttonBg: "transparent",
        buttonText: "#007AFF",
        inputBg: "#FFFFFF",
        inputBorder: "#E0E0E0",
        dockBg: "rgba(255, 255, 255, 0.7)",
        dockBorder: "rgba(0, 0, 0, 0.1)",
        menuBarBg: "rgba(255, 255, 255, 0.8)",
        menuBarText: "#000000",
        success: "#34C759",
        warning: "#FF9500",
        error: "#FF3B30",
        info: "#5AC8FA",
      },
      borderRadius: "small",
      windowChrome: {
        titleBarHeight: 22,
        trafficLightStyle: "circles-flat",
        trafficLightSize: 12,
        borderStyle: "none",
        shadowStyle: "soft",
        resizeHandleStyle: "invisible",
      },
      dock: {
        style: "glass",
        backdropBlur: 20,
        magnification: false,
        reflections: false,
      },
      animations: {
        transitionDuration: 200,
        easing: "ease",
        enableBounce: false,
        enableGenie: false,
      },
    },
    dark: {
      id: "flat-dark",
      name: "Clarity Dark",
      era: "flat",
      colors: {
        bgPrimary: "#1C1C1E",
        bgSecondary: "#2C2C2E",
        bgTertiary: "#3A3A3C",
        textPrimary: "#FFFFFF",
        textSecondary: "#8E8E93",
        textMuted: "#48484A",
        accent: "#0A84FF",
        accentHover: "#409CFF",
        accentActive: "#007AFF",
        windowBg: "#1C1C1E",
        windowBorder: "transparent",
        titleBarBg: "#1C1C1E",
        titleBarText: "#FFFFFF",
        buttonBg: "transparent",
        buttonText: "#0A84FF",
        inputBg: "#1C1C1E",
        inputBorder: "#3A3A3C",
        dockBg: "rgba(28, 28, 30, 0.7)",
        dockBorder: "rgba(255, 255, 255, 0.08)",
        menuBarBg: "rgba(28, 28, 30, 0.8)",
        menuBarText: "#FFFFFF",
        success: "#30D158",
        warning: "#FF9F0A",
        error: "#FF453A",
        info: "#64D2FF",
      },
      borderRadius: "small",
      windowChrome: {
        titleBarHeight: 22,
        trafficLightStyle: "circles-flat",
        trafficLightSize: 12,
        borderStyle: "none",
        shadowStyle: "soft",
        resizeHandleStyle: "invisible",
      },
      dock: {
        style: "glass",
        backdropBlur: 20,
        magnification: false,
        reflections: false,
      },
    },
  },

  // ── Big Sur (2020–2024) — Rounded everything, neumorphism, squircle icons ──
  "big-sur": {
    light: {
      id: "big-sur",
      name: "Big Sur",
      era: "big-sur",
      colors: {
        bgPrimary: "#FFFFFF",
        bgSecondary: "#F5F5F7",
        bgTertiary: "#E8E8ED",
        textPrimary: "#1D1D1F",
        textSecondary: "#6E6E73",
        textMuted: "#AEAEB2",
        accent: "#007AFF",
        accentHover: "#0066DD",
        accentActive: "#0055BB",
        windowBg: "#FFFFFF",
        windowBorder: "rgba(0, 0, 0, 0.08)",
        titleBarBg: "#F6F6F6",
        titleBarText: "#1D1D1F",
        buttonBg: "#E5E5EA",
        buttonText: "#1D1D1F",
        inputBg: "#FFFFFF",
        inputBorder: "#D1D1D6",
        dockBg: "rgba(255, 255, 255, 0.6)",
        dockBorder: "rgba(0, 0, 0, 0.1)",
        menuBarBg: "rgba(246, 246, 246, 0.8)",
        menuBarText: "#1D1D1F",
        success: "#34C759",
        warning: "#FF9500",
        error: "#FF3B30",
        info: "#5AC8FA",
      },
      borderRadius: "large",
      windowChrome: {
        titleBarHeight: 28,
        trafficLightStyle: "circles-flat",
        trafficLightSize: 12,
        borderStyle: "none",
        shadowStyle: "soft",
        resizeHandleStyle: "invisible",
      },
      dock: {
        style: "glass",
        backdropBlur: 20,
        magnification: true,
        reflections: false,
      },
      animations: {
        transitionDuration: 250,
        easing: "ease",
        enableBounce: false,
        enableGenie: true,
      },
    },
    dark: {
      id: "big-sur-dark",
      name: "Big Sur Dark",
      era: "big-sur",
      colors: {
        bgPrimary: "#1E1E1E",
        bgSecondary: "#2D2D2D",
        bgTertiary: "#3A3A3A",
        textPrimary: "#FFFFFF",
        textSecondary: "#98989D",
        textMuted: "#636366",
        accent: "#0A84FF",
        accentHover: "#409CFF",
        accentActive: "#007AFF",
        windowBg: "#1E1E1E",
        windowBorder: "rgba(255, 255, 255, 0.08)",
        titleBarBg: "#2D2D2D",
        titleBarText: "#FFFFFF",
        buttonBg: "#3A3A3C",
        buttonText: "#FFFFFF",
        inputBg: "#1E1E1E",
        inputBorder: "#3A3A3C",
        dockBg: "rgba(30, 30, 30, 0.6)",
        dockBorder: "rgba(255, 255, 255, 0.08)",
        menuBarBg: "rgba(30, 30, 30, 0.8)",
        menuBarText: "#FFFFFF",
        success: "#30D158",
        warning: "#FF9F0A",
        error: "#FF453A",
        info: "#64D2FF",
      },
      borderRadius: "large",
      windowChrome: {
        titleBarHeight: 28,
        trafficLightStyle: "circles-flat",
        trafficLightSize: 12,
        borderStyle: "none",
        shadowStyle: "soft",
        resizeHandleStyle: "invisible",
      },
      dock: {
        style: "glass",
        backdropBlur: 20,
        magnification: true,
        reflections: false,
      },
    },
  },

  // ── Liquid Glass (macOS Tahoe / 2025+) — Translucent refraction, dynamic light ──
  "liquid-glass": {
    light: {
      id: "liquid-glass",
      name: "Liquid Glass",
      era: "liquid-glass",
      colors: {
        bgPrimary: "#FAFAFA",
        bgSecondary: "#F0F0F2",
        bgTertiary: "#E5E5EA",
        textPrimary: "#1D1D1F",
        textSecondary: "#6E6E73",
        textMuted: "#AEAEB2",
        accent: "#007AFF",
        accentHover: "#0066DD",
        accentActive: "#0055BB",
        windowBg: "rgba(255, 255, 255, 0.72)",
        windowBorder: "rgba(255, 255, 255, 0.5)",
        titleBarBg: "rgba(255, 255, 255, 0.6)",
        titleBarText: "#1D1D1F",
        buttonBg: "rgba(255, 255, 255, 0.5)",
        buttonText: "#1D1D1F",
        inputBg: "rgba(255, 255, 255, 0.8)",
        inputBorder: "rgba(255, 255, 255, 0.3)",
        dockBg: "rgba(255, 255, 255, 0.45)",
        dockBorder: "rgba(255, 255, 255, 0.6)",
        menuBarBg: "rgba(255, 255, 255, 0.65)",
        menuBarText: "#1D1D1F",
        success: "#34C759",
        warning: "#FF9500",
        error: "#FF3B30",
        info: "#5AC8FA",
      },
      borderRadius: "large",
      windowChrome: {
        titleBarHeight: 28,
        trafficLightStyle: "circles-glass",
        trafficLightSize: 12,
        borderStyle: "none",
        shadowStyle: "glass",
        resizeHandleStyle: "invisible",
      },
      dock: {
        style: "glass",
        backdropBlur: 40,
        magnification: true,
        reflections: false,
      },
      materials: {
        glassBlur: 40,
        glassOpacity: 0.45,
        glassRefraction: true,
      },
      animations: {
        transitionDuration: 250,
        easing: "cubic-bezier(0.2, 0, 0, 1)",
        enableBounce: false,
        enableGenie: true,
      },
    },
    dark: {
      id: "liquid-glass-dark",
      name: "Liquid Glass Dark",
      era: "liquid-glass",
      colors: {
        bgPrimary: "#1A1A1A",
        bgSecondary: "#2A2A2A",
        bgTertiary: "#3A3A3A",
        textPrimary: "#FFFFFF",
        textSecondary: "#98989D",
        textMuted: "#636366",
        accent: "#0A84FF",
        accentHover: "#409CFF",
        accentActive: "#007AFF",
        windowBg: "rgba(30, 30, 30, 0.72)",
        windowBorder: "rgba(255, 255, 255, 0.1)",
        titleBarBg: "rgba(30, 30, 30, 0.6)",
        titleBarText: "#FFFFFF",
        buttonBg: "rgba(60, 60, 60, 0.5)",
        buttonText: "#FFFFFF",
        inputBg: "rgba(30, 30, 30, 0.8)",
        inputBorder: "rgba(255, 255, 255, 0.1)",
        dockBg: "rgba(30, 30, 30, 0.55)",
        dockBorder: "rgba(255, 255, 255, 0.1)",
        menuBarBg: "rgba(30, 30, 30, 0.65)",
        menuBarText: "#FFFFFF",
        success: "#30D158",
        warning: "#FF9F0A",
        error: "#FF453A",
        info: "#64D2FF",
      },
      borderRadius: "large",
      windowChrome: {
        titleBarHeight: 28,
        trafficLightStyle: "circles-glass",
        trafficLightSize: 12,
        borderStyle: "none",
        shadowStyle: "glass",
        resizeHandleStyle: "invisible",
      },
      dock: {
        style: "glass",
        backdropBlur: 40,
        magnification: true,
        reflections: false,
      },
      materials: {
        glassBlur: 40,
        glassOpacity: 0.55,
        glassRefraction: true,
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Theme resolver
// ---------------------------------------------------------------------------

/**
 * Resolve the active theme from era + darkMode.
 * This is the single source of truth for what theme is active.
 */
export function getActiveTheme(
  era: EraId,
  darkMode: boolean,
): CustomTheme {
  const eraThemes = ERA_THEMES[era] ?? ERA_THEMES["liquid-glass"];
  return darkMode ? eraThemes.dark : eraThemes.light;
}

/**
 * Derive the WindowStyle (data-window-style attribute) from an EraId.
 * Every era maps directly to its own window style.
 */
export function eraToWindowStyle(era: EraId): EraId {
  return era;
}

// ---------------------------------------------------------------------------
// Migration: old themeId → new era + darkMode
// ---------------------------------------------------------------------------

interface MigrationResult {
  era: EraId;
  darkMode: boolean;
}

/**
 * Map a legacy themeId to the new era + darkMode model.
 * Returns null if the themeId is not recognized (shouldn't happen).
 */
export function migrateThemeId(themeId: string): MigrationResult | null {
  const map: Record<string, MigrationResult> = {
    "berry-classic":      { era: "platinum",      darkMode: false },
    "berry-dark":         { era: "platinum",      darkMode: true },
    "nouns":              { era: "flat",           darkMode: false },
    "nouns-dark":         { era: "flat",           darkMode: true },
    "midnight":           { era: "flat",           darkMode: true },
    "paper":              { era: "flat",           darkMode: false },
    "system1":            { era: "platinum",       darkMode: false },
    "aqua":               { era: "aqua",           darkMode: false },
    "aqua-dark":          { era: "aqua",           darkMode: true },
    "skeuomorphic":       { era: "skeuomorphic",   darkMode: false },
    "skeuomorphic-dark":  { era: "skeuomorphic",   darkMode: true },
    "clarity":            { era: "flat",           darkMode: false },
    "clarity-dark":       { era: "flat",           darkMode: true },
    "big-sur":            { era: "big-sur",        darkMode: false },
    "big-sur-dark":       { era: "big-sur",        darkMode: true },
    "liquid-glass":       { era: "liquid-glass",   darkMode: false },
    "liquid-glass-dark":  { era: "liquid-glass",   darkMode: true },
  };

  return map[themeId] ?? null;
}

// ---------------------------------------------------------------------------
// Legacy compat — BUILT_IN_THEMES (deprecated, kept for migration consumers)
// ---------------------------------------------------------------------------

/**
 * @deprecated Use ERA_THEMES + getActiveTheme() instead.
 * Flat map of all era themes keyed by their old IDs, for backward compat.
 */
export const BUILT_IN_THEMES: Record<string, CustomTheme> = Object.fromEntries(
  Object.values(ERA_THEMES).flatMap(({ light, dark }) => [
    [light.id, light],
    [dark.id, dark],
  ])
);

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

/**
 * Accent color presets
 */
export const ACCENT_COLORS = [
  { name: "Nouns Red", value: "#E93737" },
  { name: "Nouns Yellow", value: "#FFEF00" },
  { name: "Nouns Teal", value: "#00D1C7" },
  { name: "Berry Purple", value: "#7C3AED" },
  { name: "Ocean Blue", value: "#0EA5E9" },
  { name: "Forest Green", value: "#22C55E" },
  { name: "Sunset Orange", value: "#F97316" },
  { name: "Rose Pink", value: "#EC4899" },
];

/**
 * Wallpaper presets — curated gradients and solids inspired by macOS history.
 * Each entry has an optional `era` tag for "recommended" grouping in Settings.
 * Values can be: hex colors, CSS gradients, or image URLs.
 */
export type WallpaperCategory =
  | "landscape"   // Nature-inspired scenic gradients (sky, ocean, mountain, desert)
  | "abstract"    // Artistic / geometric / mesh gradients
  | "minimal"     // Clean solids and subtle tones
  | "nouns";      // Nouns DAO themed

export interface WallpaperPreset {
  name: string;
  value: string;
  category: WallpaperCategory;
  fallbackBg?: string; // Fallback solid color for theme-color meta (for gradients)
}

export const WALLPAPER_CATEGORIES: { id: WallpaperCategory; label: string }[] = [
  { id: "landscape", label: "Landscape" },
  { id: "abstract", label: "Abstract" },
  { id: "minimal", label: "Minimal" },
  { id: "nouns", label: "Nouns" },
];

export const WALLPAPERS: WallpaperPreset[] = [
  // ── Landscape — nature-inspired scenic gradients ──

  // Sky & atmosphere
  { name: "Sunrise", category: "landscape", value: "linear-gradient(180deg, #1B1464 0%, #6C3483 25%, #E74C3C 55%, #F5B041 80%, #FAD7A0 100%)", fallbackBg: "#E74C3C" },
  { name: "Golden Hour", category: "landscape", value: "linear-gradient(180deg, #5B86E5 0%, #E8A87C 40%, #D4756B 70%, #C2405A 100%)", fallbackBg: "#D4756B" },
  { name: "Clear Day", category: "landscape", value: "linear-gradient(180deg, #2980B9 0%, #6DD5FA 60%, #FFFFFF 100%)", fallbackBg: "#6DD5FA" },
  { name: "Overcast", category: "landscape", value: "linear-gradient(180deg, #606C88 0%, #8E9AAF 50%, #BDC3C7 100%)", fallbackBg: "#8E9AAF" },
  { name: "Northern Lights", category: "landscape", value: "linear-gradient(160deg, #0B0E2D 0%, #1B4332 30%, #2ECC71 55%, #1ABC9C 75%, #6C3483 100%)", fallbackBg: "#1B4332" },

  // Ocean & water
  { name: "Deep Ocean", category: "landscape", value: "linear-gradient(180deg, #0A1628 0%, #0C2D4A 40%, #1A5276 70%, #2980B9 100%)", fallbackBg: "#0C2D4A" },
  { name: "Lagoon", category: "landscape", value: "linear-gradient(180deg, #0E4D64 0%, #1ABC9C 50%, #76D7C4 100%)", fallbackBg: "#1ABC9C" },

  // Desert & earth
  { name: "Mojave", category: "landscape", value: "linear-gradient(180deg, #D4A574 0%, #C68E5B 40%, #8F6A4A 70%, #4A3A2F 100%)", fallbackBg: "#8F6A4A" },
  { name: "Dusk Canyon", category: "landscape", value: "linear-gradient(180deg, #2C1810 0%, #8B4513 35%, #CD853F 65%, #DEB887 100%)", fallbackBg: "#8B4513" },

  // Forest & mountain
  { name: "Alpine", category: "landscape", value: "linear-gradient(180deg, #E8F4FD 0%, #A3C9E2 30%, #4A7C59 60%, #2D5016 100%)", fallbackBg: "#4A7C59" },
  { name: "Redwood", category: "landscape", value: "linear-gradient(180deg, #1B4332 0%, #2D6A4F 40%, #52796F 70%, #84A98C 100%)", fallbackBg: "#2D6A4F" },

  // ── Abstract — artistic, geometric, mesh-style gradients ──

  { name: "Ultraviolet", category: "abstract", value: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)", fallbackBg: "#764BA2" },
  { name: "Candy", category: "abstract", value: "linear-gradient(135deg, #F093FB 0%, #F5576C 50%, #FFD194 100%)", fallbackBg: "#F5576C" },
  { name: "Electric", category: "abstract", value: "linear-gradient(135deg, #00F5A0 0%, #00D9F5 100%)", fallbackBg: "#00D9F5" },
  { name: "Ember", category: "abstract", value: "radial-gradient(ellipse at 30% 50%, #FF6B35 0%, #D32F2F 50%, #4A0E0E 100%)", fallbackBg: "#D32F2F" },
  { name: "Mesh Violet", category: "abstract", value: "radial-gradient(ellipse at 20% 80%, #B388FF 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, #82B1FF 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, #EA80FC 0%, #311B92 100%)", fallbackBg: "#311B92" },
  { name: "Mesh Coral", category: "abstract", value: "radial-gradient(ellipse at 80% 80%, #FFAB91 0%, transparent 50%), radial-gradient(ellipse at 20% 30%, #FF8A80 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, #FCE4EC 0%, #BF360C 100%)", fallbackBg: "#BF360C" },
  { name: "Big Sur", category: "abstract", value: "linear-gradient(135deg, #003D82 0%, #0066CC 30%, #FF6B9D 60%, #FFA07A 100%)", fallbackBg: "#0066CC" },
  { name: "Iridescent", category: "abstract", value: "linear-gradient(135deg, #A8E6CF 0%, #88D8B0 20%, #7EC8E3 40%, #B5A8D4 60%, #E8A0BF 80%, #FFB7B2 100%)", fallbackBg: "#7EC8E3" },

  // ── Minimal — clean solids and subtle tones ──

  { name: "Teal", category: "minimal", value: "#008080" },
  { name: "Platinum", category: "minimal", value: "linear-gradient(180deg, #E8E8E8 0%, #B0B0B0 100%)", fallbackBg: "#C0C0C0" },
  { name: "Linen", category: "minimal", value: "#D4C9B8" },
  { name: "Midnight", category: "minimal", value: "#0D1117" },
  { name: "Charcoal", category: "minimal", value: "#374151" },
  { name: "Stone", category: "minimal", value: "#78716C" },
  { name: "Fog", category: "minimal", value: "#D1D5DB" },
  { name: "Snow", category: "minimal", value: "#F9FAFB" },
  { name: "Ink", category: "minimal", value: "#1E293B" },
  { name: "Forest", category: "minimal", value: "#1B4332" },
  { name: "Navy", category: "minimal", value: "#1E3A5F" },

  // ── Nouns — Nouns DAO branded ──

  { name: "Nouns Warm", category: "nouns", value: "#E1D7D5" },
  { name: "Nouns Cool", category: "nouns", value: "#D5D7E1" },
  { name: "Nouns Gradient", category: "nouns", value: "linear-gradient(135deg, #E1D7D5 0%, #D5D7E1 100%)", fallbackBg: "#D5D7E1" },
  { name: "Nouns Red", category: "nouns", value: "linear-gradient(135deg, #E8543E 0%, #C1272D 100%)", fallbackBg: "#C1272D" },
  { name: "Noggle Blue", category: "nouns", value: "linear-gradient(135deg, #5B9BD5 0%, #2E75B6 100%)", fallbackBg: "#2E75B6" },
];
