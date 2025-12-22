/**
 * Apply Settings
 * Functions to apply settings to the DOM and OS state
 */

import type { SystemSettings, CustomTheme } from "@/OS/types/settings";
import { BUILT_IN_THEMES } from "./defaults";

/**
 * Apply appearance settings to the document
 */
export function applyAppearance(appearance: SystemSettings["appearance"]) {
  const root = document.documentElement;

  // Get theme colors
  const themeId = appearance.themeId as keyof typeof BUILT_IN_THEMES;
  const theme: CustomTheme | undefined = BUILT_IN_THEMES[themeId];

  if (theme) {
    applyThemeColors(theme);
  }

  // Override accent color if custom
  root.style.setProperty("--berry-accent", appearance.accentColor);
  root.style.setProperty("--berry-primary", appearance.accentColor);

  // Wallpaper - can be a color (#hex) or image URL
  if (appearance.wallpaper && appearance.wallpaper !== "none") {
    const isColor = appearance.wallpaper.startsWith("#") || appearance.wallpaper.startsWith("rgb");
    
    if (isColor) {
      // Solid color wallpaper - set as desktop background, no image
      root.style.setProperty("--berry-desktop-bg", appearance.wallpaper);
      root.style.removeProperty("--berry-wallpaper");
      root.style.setProperty("--berry-wallpaper-stipple", "0.3"); // Subtle stipple on solid colors
    } else {
      // Image URL wallpaper
      root.style.setProperty("--berry-wallpaper", `url(${appearance.wallpaper})`);
      root.style.setProperty("--berry-wallpaper-stipple", "0"); // No stipple on images
    }
  } else {
    // No wallpaper - use theme's default desktop color with stipple
    root.style.removeProperty("--berry-wallpaper");
    root.style.setProperty("--berry-wallpaper-stipple", "1"); // Full stipple
  }

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

  // Window style
  root.dataset.windowStyle = appearance.windowStyle;

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

  // Determine if dark theme and set desktop background
  const isDark = isColorDark(colors.bgPrimary);
  root.dataset.theme = isDark ? "dark" : "light";
  
  // Desktop background - derive from theme
  const desktopBg = isDark ? "#1a3a3a" : "#008080"; // Teal variants
  root.style.setProperty("--berry-desktop-bg", desktopBg);
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

