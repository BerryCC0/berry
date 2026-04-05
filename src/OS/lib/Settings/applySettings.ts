/**
 * Apply Settings
 * Functions to apply settings to the DOM and OS state.
 *
 * The theme system has two layers:
 *   1. Era tokens (set via data-window-style attribute in CSS)
 *   2. Theme colors (set via CSS custom properties from the resolved era theme)
 *
 * The model resolves themes via: getActiveTheme(era, darkMode)
 */

import type { SystemSettings, CustomTheme } from "@/OS/types/settings";
import { ERA_THEMES, getActiveTheme } from "./defaults";

/**
 * Update the theme-color meta tag for mobile browser chrome
 * This controls the color of the status bar area on iOS Safari
 */
function updateThemeColorMeta(color: string) {
  let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = color;
}

/**
 * Apply appearance settings to the document
 */
export function applyAppearance(appearance: SystemSettings["appearance"]) {
  const root = document.documentElement;

  // --- Layer 1: Era tokens via data attribute ---
  // The CSS in globals.css uses [data-window-style="..."] selectors
  // to set era-specific tokens (font, radii, shadows, blur, etc.)
  root.dataset.windowStyle = appearance.era;

  // --- Layer 2: Resolve and apply theme colors ---
  const theme = getActiveTheme(appearance.era, appearance.darkMode);

  applyThemeColors(theme);

  // Apply extended era tokens from theme if present
  if (theme.typography) {
    applyTypography(theme.typography);
  }
  if (theme.windowChrome) {
    applyWindowChrome(theme.windowChrome);
  }

  // Override accent color if custom
  root.style.setProperty("--berry-accent", appearance.accentColor);
  root.style.setProperty("--berry-primary", appearance.accentColor);

  // Track the effective desktop background color for theme-color meta
  let effectiveDesktopBg = getComputedStyle(root).getPropertyValue('--berry-desktop-bg').trim() || '#008080';

  // Wallpaper — can be a solid color (#hex/rgb), CSS gradient, or image URL
  if (appearance.wallpaper && appearance.wallpaper !== "none") {
    const wp = appearance.wallpaper;
    const isColor = wp.startsWith("#") || wp.startsWith("rgb");
    const isGradient = wp.startsWith("linear-gradient") || wp.startsWith("radial-gradient");

    if (isColor) {
      // Solid color wallpaper
      root.style.setProperty("--berry-desktop-bg", wp);
      root.style.removeProperty("--berry-wallpaper");
      root.style.setProperty("--berry-wallpaper-stipple", "0.3");
      effectiveDesktopBg = wp;
    } else if (isGradient) {
      // CSS gradient wallpaper — applied as background-image
      root.style.setProperty("--berry-wallpaper", wp);
      root.style.setProperty("--berry-wallpaper-stipple", "0");
      // Use a neutral dark bg behind the gradient for theme-color meta
      root.style.setProperty("--berry-desktop-bg", "#1a1a1a");
      effectiveDesktopBg = "#1a1a1a";
    } else {
      // Image URL wallpaper
      root.style.setProperty("--berry-wallpaper", `url(${wp})`);
      root.style.setProperty("--berry-wallpaper-stipple", "0");
      root.style.setProperty("--berry-desktop-bg", "#1a1a1a");
      effectiveDesktopBg = "#1a1a1a";
    }
  } else {
    // No wallpaper — use theme's default desktop color with stipple
    root.style.removeProperty("--berry-wallpaper");
    root.style.setProperty("--berry-wallpaper-stipple", "1");
  }

  // Update browser chrome color on mobile
  updateThemeColorMeta(effectiveDesktopBg);

  // Font size
  const fontSizes = { small: "12px", default: "14px", large: "16px" };
  root.style.setProperty("--berry-font-size-base", fontSizes[appearance.fontSize]);

  // Reduce motion
  if (appearance.reduceMotion) {
    root.classList.add("reduce-motion");
  } else {
    root.classList.remove("reduce-motion");
  }

  // Reduce transparency
  if (appearance.reduceTransparency) {
    root.classList.add("reduce-transparency");
  } else {
    root.classList.remove("reduce-transparency");
  }

  // Desktop icon size
  const iconSizes = { small: "48px", medium: "64px", large: "80px" };
  root.style.setProperty(
    "--berry-desktop-icon-size",
    iconSizes[appearance.desktopIconSize]
  );
}

/**
 * Apply theme colors to CSS variables
 */
export function applyThemeColors(theme: CustomTheme) {
  const root = document.documentElement;
  const { colors } = theme;

  // Background colors
  root.style.setProperty("--berry-bg", colors.bgPrimary);
  root.style.setProperty("--berry-bg-secondary", colors.bgSecondary);
  root.style.setProperty("--berry-bg-tertiary", colors.bgTertiary);

  // Text colors
  root.style.setProperty("--berry-text-primary", colors.textPrimary);
  root.style.setProperty("--berry-text-secondary", colors.textSecondary);
  root.style.setProperty("--berry-text-muted", colors.textMuted);

  // Accent colors
  root.style.setProperty("--berry-accent", colors.accent);
  root.style.setProperty("--berry-primary", colors.accent);
  root.style.setProperty("--berry-primary-hover", colors.accentHover);
  root.style.setProperty("--berry-accent-hover", colors.accentHover);
  root.style.setProperty("--berry-accent-active", colors.accentActive);

  // Window chrome
  root.style.setProperty("--berry-window-bg", colors.windowBg);
  root.style.setProperty("--berry-window-border", colors.windowBorder);
  root.style.setProperty("--berry-title-bar-bg", colors.titleBarBg);
  root.style.setProperty("--berry-title-bar-text", colors.titleBarText);

  // Controls
  root.style.setProperty("--berry-button-bg", colors.buttonBg);
  root.style.setProperty("--berry-button-text", colors.buttonText);
  root.style.setProperty("--berry-input-bg", colors.inputBg);
  root.style.setProperty("--berry-input-border", colors.inputBorder);

  // Dock
  root.style.setProperty("--berry-dock-bg", colors.dockBg);
  root.style.setProperty("--berry-dock-border", colors.dockBorder);

  // Menu bar
  root.style.setProperty("--berry-menu-bar-bg", colors.menuBarBg);
  root.style.setProperty("--berry-menu-bar-text", colors.menuBarText);

  // Semantic
  root.style.setProperty("--berry-success", colors.success);
  root.style.setProperty("--berry-warning", colors.warning);
  root.style.setProperty("--berry-error", colors.error);
  root.style.setProperty("--berry-info", colors.info);

  // Border radius
  if (theme.borderRadius) {
    const radiusMap = { none: "0", small: "4px", medium: "8px", large: "12px" };
    root.style.setProperty("--berry-border-radius", radiusMap[theme.borderRadius]);
  }

  // Window shadow (theme-level override)
  if (theme.windowShadow) {
    root.style.setProperty("--berry-window-shadow", theme.windowShadow);
  }

  // Font family (theme-level override)
  if (theme.fontFamily) {
    root.style.setProperty("--berry-font-system", theme.fontFamily);
  }

  // Determine if dark theme and set desktop background
  const isDark = isColorDark(colors.bgPrimary);
  root.dataset.theme = isDark ? "dark" : "light";

  // Desktop background - derive from theme
  const desktopBg = isDark ? "#1a3a3a" : "#008080"; // Teal variants
  root.style.setProperty("--berry-desktop-bg", desktopBg);
}

/**
 * Apply extended typography tokens from theme
 */
function applyTypography(typo: NonNullable<CustomTheme["typography"]>) {
  const root = document.documentElement;
  root.style.setProperty("--berry-font-system", typo.systemFont);
  root.style.setProperty("--berry-font-size-base", `${typo.baseFontSize}px`);

  // Font smoothing
  switch (typo.fontSmoothing) {
    case "none":
      root.style.setProperty("-webkit-font-smoothing", "none");
      break;
    case "antialiased":
      root.style.setProperty("-webkit-font-smoothing", "antialiased");
      break;
    default:
      root.style.setProperty("-webkit-font-smoothing", "auto");
  }
}

/**
 * Apply extended window chrome tokens from theme
 */
function applyWindowChrome(chrome: NonNullable<CustomTheme["windowChrome"]>) {
  const root = document.documentElement;
  root.style.setProperty("--berry-title-bar-height", `${chrome.titleBarHeight}px`);
  root.style.setProperty("--berry-traffic-light-size", `${chrome.trafficLightSize}px`);

  if (chrome.titleBarGradient) {
    root.style.setProperty("--berry-title-bar-bg", chrome.titleBarGradient);
  }

  // Shadow style
  const shadows: Record<string, string> = {
    none: "none",
    hard: "2px 2px 0 rgba(0, 0, 0, 0.3)",
    soft: "0 4px 16px rgba(0, 0, 0, 0.15)",
    elevated: "0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.05)",
    glass: "0 8px 32px rgba(0, 0, 0, 0.08), inset 0 0.5px 0 rgba(255, 255, 255, 0.6)",
  };
  root.style.setProperty("--berry-window-shadow", shadows[chrome.shadowStyle] ?? shadows.soft);
}

/**
 * Apply accessibility settings
 */
export function applyAccessibility(
  accessibility: SystemSettings["accessibility"]
) {
  const root = document.documentElement;

  // High contrast
  if (accessibility.highContrast) {
    root.classList.add("high-contrast");
  } else {
    root.classList.remove("high-contrast");
  }

  // Large click targets
  if (accessibility.largeClickTargets) {
    root.classList.add("large-click-targets");
  } else {
    root.classList.remove("large-click-targets");
  }

  // Enhanced focus indicators
  if (accessibility.focusIndicators === "enhanced") {
    root.classList.add("enhanced-focus");
  } else {
    root.classList.remove("enhanced-focus");
  }

  // Screen reader hints
  if (accessibility.screenReaderHints) {
    root.setAttribute("data-screen-reader", "true");
  } else {
    root.removeAttribute("data-screen-reader");
  }
}

/**
 * Apply all settings
 */
export function applyAllSettings(settings: SystemSettings) {
  applyAppearance(settings.appearance);
  applyAccessibility(settings.accessibility);
  // Desktop and window settings are applied through their respective stores
}

/**
 * Helper: Check if a color is dark
 */
function isColorDark(hexColor: string): boolean {
  // Handle hex colors
  if (hexColor.startsWith("#")) {
    const hex = hexColor.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }
  // Default to light
  return false;
}
