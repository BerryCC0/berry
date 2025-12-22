"use client";

/**
 * ThemeProvider
 * Applies theme CSS variables to document root
 * 
 * Per ARCHITECTURE.md: Theme values should be applied as CSS custom properties
 * so all components can use var(--berry-*) to access theme values.
 */

import { useEffect, type ReactNode } from "react";
import { useThemeStore } from "@/OS/store/themeStore";
import type { Theme } from "@/OS/types/theme";

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Convert a Theme object to CSS custom properties
 */
function themeToCSSVariables(theme: Theme): Record<string, string> {
  return {
    // Window Chrome
    "--berry-window-title-bar": theme.windowChrome.titleBarColor,
    "--berry-window-title-bar-active": theme.windowChrome.titleBarColorActive,
    "--berry-window-border": theme.windowChrome.borderColor,
    "--berry-window-border-width": `${theme.windowChrome.borderWidth}px`,
    "--berry-window-corner-radius": `${theme.windowChrome.cornerRadius}px`,
    "--berry-window-shadow": `0 ${theme.windowChrome.shadowBlur}px ${theme.windowChrome.shadowBlur * 2}px ${theme.windowChrome.shadowColor}`,

    // Desktop
    "--berry-desktop-bg": theme.desktop.backgroundColor,
    "--berry-desktop-icon-size": getIconSizeValue(theme.desktop.iconSize),
    "--berry-desktop-icon-spacing": `${theme.desktop.iconSpacing}px`,

    // Dock
    "--berry-dock-bg": theme.dock.backgroundColor,
    "--berry-dock-size": `${theme.dock.size}px`,
    "--berry-dock-icon-size": `${theme.dock.iconSize}px`,

    // Menu Bar
    "--berry-menubar-bg": theme.menuBar.backgroundColor,
    "--berry-menubar-text": theme.menuBar.textColor,
    "--berry-menubar-height": `${theme.menuBar.height}px`,

    // Typography
    "--berry-font-system": theme.typography.systemFont,
    "--berry-font-size": `${theme.typography.fontSize}px`,

    // Colors
    "--berry-primary": theme.colors.primary,
    "--berry-secondary": theme.colors.secondary,
    "--berry-accent": theme.colors.accent,
    "--berry-text": theme.colors.text,
    "--berry-text-secondary": theme.colors.textSecondary,
    "--berry-bg": theme.colors.background,
    "--berry-bg-secondary": theme.colors.backgroundSecondary,
    "--berry-border": theme.colors.border,

    // Buttons
    "--berry-button-primary-bg": theme.buttons.primaryBackground,
    "--berry-button-primary-text": theme.buttons.primaryText,
    "--berry-button-border-radius": `${theme.buttons.borderRadius}px`,
    "--berry-button-border-width": `${theme.buttons.borderWidth}px`,
    "--berry-button-border": theme.buttons.borderColor,
  };
}

/**
 * Convert icon size enum to pixel value
 */
function getIconSizeValue(size: "small" | "medium" | "large"): string {
  switch (size) {
    case "small":
      return "48px";
    case "medium":
      return "64px";
    case "large":
      return "80px";
    default:
      return "64px";
  }
}

/**
 * Apply CSS variables to document root
 */
function applyThemeToRoot(theme: Theme): void {
  if (typeof document === "undefined") return;

  const cssVars = themeToCSSVariables(theme);
  const root = document.documentElement;

  Object.entries(cssVars).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });

  // Apply wallpaper if set
  if (theme.desktop.wallpaper) {
    root.style.setProperty("--berry-desktop-wallpaper", `url(${theme.desktop.wallpaper})`);
  } else {
    root.style.removeProperty("--berry-desktop-wallpaper");
  }
}

/**
 * ThemeProvider Component
 * Subscribes to theme changes and applies them to the document root
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const currentTheme = useThemeStore((state) => state.currentTheme);

  // Apply theme on mount and whenever it changes
  useEffect(() => {
    applyThemeToRoot(currentTheme);
  }, [currentTheme]);

  return <>{children}</>;
}

/**
 * Hook to get current theme (for components that need direct access)
 */
export function useTheme(): Theme {
  return useThemeStore((state) => state.currentTheme);
}

