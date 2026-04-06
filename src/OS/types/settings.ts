/**
 * System Settings Types
 * Type definitions for user-customizable preferences
 */

/**
 * Era-specific window rendering modes.
 * Each activates a different CSS class that controls chrome rendering logic.
 * "classic" and "modern" are kept for backward compatibility.
 */
export type WindowStyle =
  | "classic"        // Alias for "platinum" (backward compat)
  | "modern"         // Alias for "flat" (backward compat)
  | "platinum"       // Mac OS 8–9 — beveled 3D, metallic grays
  | "aqua"           // Mac OS X 10.0–10.4 — gel buttons, pinstripes
  | "skeuomorphic"   // iOS 4–6 / OS X Lion — leather, linen, wood
  | "flat"           // iOS 7 / OS X Yosemite — clarity, deference, depth
  | "big-sur"        // macOS Big Sur–Sonoma — rounded everything
  | "liquid-glass";  // macOS Tahoe / iOS 26 — translucent refraction

/**
 * Appearance settings
 *
 * The new model uses two independent axes:
 *   Era (1 of 7) × Dark Mode (on/off)
 *
 * `era` + `darkMode` replace the old `themeId` string.
 * `windowStyle` is now derived from `era` (no longer stored).
 */
export interface AppearanceSettings {
  era: EraId;
  darkMode: boolean;
  /**
   * Color scheme preference:
   * - "light" / "dark" — explicit override (ignores OS preference)
   * - "auto" — follows `prefers-color-scheme` media query
   *
   * When "auto", the resolved value is written to `darkMode` at runtime.
   * Defaults to "auto" for new installs; existing users who toggled darkMode
   * keep their explicit setting via migration.
   */
  colorScheme: "light" | "dark" | "auto";
  accentColor: string;
  wallpaper: string;
  desktopIconSize: "small" | "medium" | "large";
  fontSize: "small" | "default" | "large";
  reduceMotion: boolean;
  reduceTransparency: boolean;

  // Legacy fields — kept temporarily for migration; never read by new code
  /** @deprecated Use `era` + `darkMode` instead */
  themeId?: string;
  /** @deprecated Derived from `era` */
  windowStyle?: WindowStyle;
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

  // Optional overrides (existing)
  borderRadius?: "none" | "small" | "medium" | "large";
  fontFamily?: string;
  windowShadow?: string;

  // Era identification
  era?: EraId;

  // Extended era tokens
  typography?: ThemeTypography;
  windowChrome?: ThemeWindowChrome;
  dock?: ThemeDock;
  menuBar?: ThemeMenuBar;
  materials?: ThemeMaterials;
  animations?: ThemeAnimations;
}

// ---------------------------------------------------------------------------
// Era system types
// ---------------------------------------------------------------------------

/**
 * All recognized design eras
 */
export type EraId =
  | "platinum"
  | "aqua"
  | "skeuomorphic"
  | "flat"
  | "big-sur"
  | "liquid-glass";

/**
 * Typography tokens that vary per era
 */
export interface ThemeTypography {
  systemFont: string;
  monoFont?: string;
  headingFont?: string;
  baseFontSize: number;       // px
  menuFontSize: number;       // px
  titleFontSize: number;      // px
  fontSmoothing: "auto" | "antialiased" | "none";
}

/**
 * Window chrome tokens that vary per era
 */
export interface ThemeWindowChrome {
  titleBarHeight: number;     // px
  titleBarGradient?: string;  // CSS gradient or solid color
  trafficLightStyle: "boxes" | "circles-flat" | "circles-gel" | "circles-glass";
  trafficLightSize: number;   // px
  borderStyle: "solid" | "bevel-outset" | "bevel-inset" | "none";
  shadowStyle: "hard" | "soft" | "elevated" | "glass" | "none";
  resizeHandleStyle: "lines" | "corner" | "invisible";
}

/**
 * Dock tokens that vary per era
 */
export interface ThemeDock {
  style: "shelf" | "glass" | "flat" | "none";
  backdropBlur?: number;      // px, 0 = no blur
  magnification: boolean;
  reflections: boolean;       // Aqua-era dock floor reflection
}

/**
 * Menu bar tokens that vary per era
 */
export interface ThemeMenuBar {
  transparency: number;       // 0–1
  backdropBlur?: number;      // px
  separator: "line" | "shadow" | "none";
}

/**
 * Material/texture tokens for specific eras
 */
export interface ThemeMaterials {
  // For Aqua / Liquid Glass eras
  glassOpacity?: number;      // 0–1
  glassBlur?: number;         // px
  glassRefraction?: boolean;
  // For skeuomorphic eras
  texture?: string;           // CSS background-image for linen/leather/pinstripe
}

/**
 * Animation tokens that vary per era
 */
export interface ThemeAnimations {
  transitionDuration: number; // ms, base duration
  easing: string;             // CSS easing function
  enableBounce: boolean;      // Aqua-era bounce effects
  enableGenie: boolean;       // Minimize genie effect
}


/**
 * Built-in theme IDs (legacy — kept for migration only)
 * @deprecated Use EraId + darkMode instead
 */
export type BuiltInThemeId =
  | "berry-classic"
  | "berry-dark"
  | "nouns"
  | "nouns-dark"
  | "midnight"
  | "paper"
  | "aqua"
  | "aqua-dark"
  | "skeuomorphic"
  | "skeuomorphic-dark"
  | "clarity"
  | "clarity-dark"
  | "big-sur"
  | "big-sur-dark"
  | "liquid-glass"
  | "liquid-glass-dark";

