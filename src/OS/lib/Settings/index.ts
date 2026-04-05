/**
 * Settings Library Exports
 */

export {
  DEFAULT_SETTINGS,
  ERA_THEMES,
  BUILT_IN_THEMES,
  ACCENT_COLORS,
  WALLPAPERS,
  WALLPAPER_CATEGORIES,
  getActiveTheme,
  eraToWindowStyle,
  migrateThemeId,
} from "./defaults";

export type { EraThemes, WallpaperPreset, WallpaperCategory } from "./defaults";

export {
  applyAppearance,
  applyThemeColors,
  applyAccessibility,
  applyAllSettings,
} from "./applySettings";
