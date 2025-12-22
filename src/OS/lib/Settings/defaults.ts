/**
 * Settings Defaults
 * Default values for all system settings
 */

import type {
  SystemSettings,
  CustomTheme,
  BuiltInThemeId,
} from "@/OS/types/settings";

/**
 * Default system settings
 */
export const DEFAULT_SETTINGS: SystemSettings = {
  appearance: {
    themeId: "berry-classic",
    accentColor: "#E93737", // Nouns Red
    wallpaper: "#008080", // Classic Teal
    windowStyle: "classic",
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

/**
 * Built-in themes
 */
export const BUILT_IN_THEMES: Record<BuiltInThemeId, CustomTheme> = {
  "berry-classic": {
    id: "berry-classic",
    name: "Berry Classic",
    colors: {
      bgPrimary: "#FFFFFF",
      bgSecondary: "#F5F5F5",
      bgTertiary: "#EBEBEB",
      textPrimary: "#000000",
      textSecondary: "#666666",
      textMuted: "#999999",
      accent: "#E93737",
      accentHover: "#D62F2F",
      accentActive: "#C22727",
      windowBg: "#FFFFFF",
      windowBorder: "#000000",
      titleBarBg: "linear-gradient(180deg, #FFFFFF 0%, #CCCCCC 100%)",
      titleBarText: "#000000",
      buttonBg: "#FFFFFF",
      buttonText: "#000000",
      inputBg: "#FFFFFF",
      inputBorder: "#999999",
      dockBg: "rgba(255, 255, 255, 0.25)",
      dockBorder: "rgba(255, 255, 255, 0.3)",
      menuBarBg: "#FFFFFF",
      menuBarText: "#000000",
      success: "#28A745",
      warning: "#FFC107",
      error: "#DC3545",
      info: "#17A2B8",
    },
    borderRadius: "small",
  },

  "berry-dark": {
    id: "berry-dark",
    name: "Berry Dark",
    colors: {
      bgPrimary: "#1E1E1E",
      bgSecondary: "#2D2D2D",
      bgTertiary: "#3C3C3C",
      textPrimary: "#FFFFFF",
      textSecondary: "#B0B0B0",
      textMuted: "#808080",
      accent: "#E93737",
      accentHover: "#FF4545",
      accentActive: "#D62F2F",
      windowBg: "#2D2D2D",
      windowBorder: "#4A4A4A",
      titleBarBg: "linear-gradient(180deg, #3C3C3C 0%, #2D2D2D 100%)",
      titleBarText: "#FFFFFF",
      buttonBg: "#3C3C3C",
      buttonText: "#FFFFFF",
      inputBg: "#2D2D2D",
      inputBorder: "#4A4A4A",
      dockBg: "rgba(30, 30, 30, 0.85)",
      dockBorder: "rgba(255, 255, 255, 0.1)",
      menuBarBg: "#2D2D2D",
      menuBarText: "#FFFFFF",
      success: "#28A745",
      warning: "#FFC107",
      error: "#DC3545",
      info: "#17A2B8",
    },
    borderRadius: "small",
  },

  nouns: {
    id: "nouns",
    name: "Nouns",
    colors: {
      bgPrimary: "#FFFFFF",
      bgSecondary: "#F8F8F8",
      bgTertiary: "#EEEEEE",
      textPrimary: "#000000",
      textSecondary: "#555555",
      textMuted: "#888888",
      accent: "#E93737", // Nouns Red
      accentHover: "#D62F2F",
      accentActive: "#C22727",
      windowBg: "#FFFFFF",
      windowBorder: "#000000",
      titleBarBg: "linear-gradient(180deg, #FFEF00 0%, #FFD700 100%)", // Nouns Yellow
      titleBarText: "#000000",
      buttonBg: "#FFFFFF",
      buttonText: "#000000",
      inputBg: "#FFFFFF",
      inputBorder: "#CCCCCC",
      dockBg: "rgba(255, 255, 255, 0.9)",
      dockBorder: "rgba(0, 0, 0, 0.1)",
      menuBarBg: "#E93737", // Nouns Red menu bar
      menuBarText: "#FFFFFF",
      success: "#4CAF50",
      warning: "#FF9800",
      error: "#E93737",
      info: "#00D1C7", // Nouns Teal
    },
    borderRadius: "medium",
  },

  "nouns-dark": {
    id: "nouns-dark",
    name: "Nouns Dark",
    colors: {
      bgPrimary: "#121212",
      bgSecondary: "#1E1E1E",
      bgTertiary: "#2A2A2A",
      textPrimary: "#FFFFFF",
      textSecondary: "#AAAAAA",
      textMuted: "#666666",
      accent: "#E93737",
      accentHover: "#FF4545",
      accentActive: "#D62F2F",
      windowBg: "#1E1E1E",
      windowBorder: "#E93737",
      titleBarBg: "linear-gradient(180deg, #2A2A2A 0%, #1E1E1E 100%)",
      titleBarText: "#FFFFFF",
      buttonBg: "#2A2A2A",
      buttonText: "#FFFFFF",
      inputBg: "#1E1E1E",
      inputBorder: "#444444",
      dockBg: "rgba(18, 18, 18, 0.9)",
      dockBorder: "rgba(233, 55, 55, 0.3)",
      menuBarBg: "#1E1E1E",
      menuBarText: "#FFFFFF",
      success: "#4CAF50",
      warning: "#FF9800",
      error: "#E93737",
      info: "#00D1C7",
    },
    borderRadius: "medium",
  },

  midnight: {
    id: "midnight",
    name: "Midnight",
    colors: {
      bgPrimary: "#0D1117",
      bgSecondary: "#161B22",
      bgTertiary: "#21262D",
      textPrimary: "#E6EDF3",
      textSecondary: "#8B949E",
      textMuted: "#6E7681",
      accent: "#7C3AED", // Purple
      accentHover: "#8B5CF6",
      accentActive: "#6D28D9",
      windowBg: "#161B22",
      windowBorder: "#30363D",
      titleBarBg: "linear-gradient(180deg, #21262D 0%, #161B22 100%)",
      titleBarText: "#E6EDF3",
      buttonBg: "#21262D",
      buttonText: "#E6EDF3",
      inputBg: "#0D1117",
      inputBorder: "#30363D",
      dockBg: "rgba(13, 17, 23, 0.9)",
      dockBorder: "rgba(124, 58, 237, 0.3)",
      menuBarBg: "#161B22",
      menuBarText: "#E6EDF3",
      success: "#3FB950",
      warning: "#D29922",
      error: "#F85149",
      info: "#58A6FF",
    },
    borderRadius: "medium",
  },

  paper: {
    id: "paper",
    name: "Paper",
    colors: {
      bgPrimary: "#FAFAFA",
      bgSecondary: "#F5F5F5",
      bgTertiary: "#EEEEEE",
      textPrimary: "#212121",
      textSecondary: "#616161",
      textMuted: "#9E9E9E",
      accent: "#1976D2", // Blue
      accentHover: "#1565C0",
      accentActive: "#0D47A1",
      windowBg: "#FFFFFF",
      windowBorder: "#E0E0E0",
      titleBarBg: "#FAFAFA",
      titleBarText: "#212121",
      buttonBg: "#E0E0E0",
      buttonText: "#212121",
      inputBg: "#FFFFFF",
      inputBorder: "#BDBDBD",
      dockBg: "rgba(255, 255, 255, 0.95)",
      dockBorder: "rgba(0, 0, 0, 0.1)",
      menuBarBg: "#FAFAFA",
      menuBarText: "#212121",
      success: "#4CAF50",
      warning: "#FF9800",
      error: "#F44336",
      info: "#2196F3",
    },
    borderRadius: "small",
  },
};

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
 * Wallpaper presets (solid colors for now, can add images later)
 */
export const WALLPAPERS = [
  { name: "Classic Teal", value: "#008080" },
  { name: "Ocean Blue", value: "#1E3A5F" },
  { name: "Deep Purple", value: "#2D1B4E" },
  { name: "Forest Green", value: "#1B4332" },
  { name: "Sunset Orange", value: "#7C2D12" },
  { name: "Midnight", value: "#0D1117" },
  { name: "Warm Gray", value: "#374151" },
  { name: "Pure White", value: "#FFFFFF" },
  { name: "Pure Black", value: "#000000" },
];

