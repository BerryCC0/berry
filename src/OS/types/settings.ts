/**
 * System Settings Types
 * Type definitions for user-customizable preferences
 */

/**
 * Appearance settings
 */
export interface AppearanceSettings {
  themeId: string; // Built-in theme ID or custom theme UUID
  accentColor: string;
  wallpaper: string;
  windowStyle: "classic" | "modern";
  desktopIconSize: "small" | "medium" | "large";
  fontSize: "small" | "default" | "large";
  reduceMotion: boolean;
  reduceTransparency: boolean;
}

/**
 * Desktop & Dock settings
 */
export interface DesktopSettings {
  showIcons: boolean;
  iconGridSize: "compact" | "normal" | "spacious";
  desktopApps: string[]; // App IDs that appear as desktop icons
  dockPosition: "bottom" | "left" | "right";
  dockAutoHide: boolean;
  menuPinnedApps: string[]; // App IDs pinned to Berry Menu
}

/**
 * Window behavior settings
 */
export interface WindowSettings {
  showShadows: boolean;
  snapToEdges: boolean;
  snapThreshold: number;
  rememberPositions: boolean;
  maxOpenWindows: number;
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  enabled: boolean;
  position: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  duration: number; // milliseconds
  soundEffects: boolean;
}

/**
 * Privacy & Data settings
 */
export interface PrivacySettings {
  rememberWallet: boolean;
  clearDataOnDisconnect: boolean;
  ensResolution: boolean;
}

/**
 * Accessibility settings
 */
export interface AccessibilitySettings {
  highContrast: boolean;
  largeClickTargets: boolean;
  keyboardNavigation: boolean;
  screenReaderHints: boolean;
  focusIndicators: "default" | "enhanced";
}

/**
 * Complete system settings
 */
export interface SystemSettings {
  appearance: AppearanceSettings;
  desktop: DesktopSettings;
  windows: WindowSettings;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  accessibility: AccessibilitySettings;
}

/**
 * Custom theme definition
 */
export interface CustomTheme {
  id: string;
  name: string;
  author?: string;

  colors: {
    // Backgrounds
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;

    // Text
    textPrimary: string;
    textSecondary: string;
    textMuted: string;

    // Accent
    accent: string;
    accentHover: string;
    accentActive: string;

    // Window chrome
    windowBg: string;
    windowBorder: string;
    titleBarBg: string;
    titleBarText: string;

    // Controls
    buttonBg: string;
    buttonText: string;
    inputBg: string;
    inputBorder: string;

    // Dock
    dockBg: string;
    dockBorder: string;

    // Menu bar
    menuBarBg: string;
    menuBarText: string;

    // Semantic
    success: string;
    warning: string;
    error: string;
    info: string;
  };

  // Optional overrides
  borderRadius?: "none" | "small" | "medium" | "large";
  fontFamily?: string;
  windowShadow?: string;
}

/**
 * Built-in theme IDs
 */
export type BuiltInThemeId =
  | "berry-classic"
  | "berry-dark"
  | "nouns"
  | "nouns-dark"
  | "midnight"
  | "paper";

