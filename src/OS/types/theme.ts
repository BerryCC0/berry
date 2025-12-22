/**
 * Theme Types
 * Defines the theming system for Berry OS
 */

export type ThemePreset = "classic" | "dark" | "light" | "custom";

export type IconSize = "small" | "medium" | "large";

export type DockPosition = "bottom" | "left" | "right";

export interface WindowChromeTheme {
  titleBarColor: string;
  titleBarColorActive: string;
  borderColor: string;
  borderWidth: number;
  cornerRadius: number;
  shadowColor: string;
  shadowBlur: number;
}

export interface DesktopTheme {
  backgroundColor: string;
  wallpaper?: string;
  iconSize: IconSize;
  iconSpacing: number;
}

export interface DockTheme {
  backgroundColor: string;
  size: number;
  iconSize: number;
  position: DockPosition;
}

export interface MenuBarTheme {
  backgroundColor: string;
  textColor: string;
  height: number;
}

export interface TypographyTheme {
  systemFont: string;
  fontSize: number;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textSecondary: string;
  background: string;
  backgroundSecondary: string;
  border: string;
}

export interface ButtonTheme {
  primaryBackground: string;
  primaryText: string;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
}

export interface Theme {
  id: string;
  name: string;
  preset: ThemePreset;

  windowChrome: WindowChromeTheme;
  desktop: DesktopTheme;
  dock: DockTheme;
  menuBar: MenuBarTheme;
  typography: TypographyTheme;
  colors: ColorPalette;
  buttons: ButtonTheme;
}

/**
 * Classic Mac OS 8 theme (default)
 */
export const CLASSIC_THEME: Theme = {
  id: "classic",
  name: "Classic",
  preset: "classic",

  windowChrome: {
    titleBarColor: "#cccccc",
    titleBarColorActive: "#ffffff",
    borderColor: "#000000",
    borderWidth: 1,
    cornerRadius: 0,
    shadowColor: "#000000",
    shadowBlur: 0,
  },

  desktop: {
    backgroundColor: "#008080",
    iconSize: "medium",
    iconSpacing: 16,
  },

  dock: {
    backgroundColor: "#eeeeee",
    size: 64,
    iconSize: 48,
    position: "bottom",
  },

  menuBar: {
    backgroundColor: "#ffffff",
    textColor: "#000000",
    height: 28,
  },

  typography: {
    systemFont: '"Chicago", "Geneva", "Courier New", monospace',
    fontSize: 12,
  },

  colors: {
    primary: "#0000ff",
    secondary: "#cccccc",
    accent: "#ff00ff",
    text: "#000000",
    textSecondary: "#666666",
    background: "#ffffff",
    backgroundSecondary: "#eeeeee",
    border: "#000000",
  },

  buttons: {
    primaryBackground: "#0000ff",
    primaryText: "#ffffff",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#000000",
  },
};

