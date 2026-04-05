/**
 * Era-adaptive icon system
 *
 * Maps each EraId to its glyph set and badge style configuration.
 */

import type { CSSProperties, ReactNode } from "react";
import type { EraId } from "@/OS/types/settings";
import type { CategoryId } from "../CategoryNav";
import type { GlyphSet } from "./types";

import { platinumGlyphs } from "./platinum";
import { aquaGlyphs } from "./aqua";
import { skeuomorphicGlyphs } from "./skeuomorphic";
import { flatGlyphs } from "./flat";
import { bigSurGlyphs } from "./bigSur";
import { liquidGlassGlyphs } from "./liquidGlass";

// ---------------------------------------------------------------------------
// Badge style factories — each era returns inline styles for the badge wrapper
// ---------------------------------------------------------------------------

export type BadgeStyleFn = (color: string, size: number) => CSSProperties;

const badgePlatinum: BadgeStyleFn = (_color, size) => ({
  width: size,
  height: size,
  borderRadius: 2,
  background: "linear-gradient(180deg, #E8E8E8 0%, #C8C8C8 100%)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
});

const badgePlatinumDark: BadgeStyleFn = (_color, size) => ({
  width: size,
  height: size,
  borderRadius: 2,
  background: "linear-gradient(180deg, #4A4A4A 0%, #3A3A3A 100%)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.3)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#CCCCCC",
});

const badgeAqua: BadgeStyleFn = (color, size) => ({
  width: size,
  height: size,
  borderRadius: size * 0.3,
  background: `linear-gradient(180deg, ${lighten(color, 0.15)} 0%, ${color} 45%, ${darken(color, 0.15)} 100%)`,
  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 3px rgba(0,0,0,0.3)`,
  border: `1px solid ${darken(color, 0.2)}`,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
  // Aqua shine overlay handled via CSS pseudo-element
});

const badgeSkeuomorphic: BadgeStyleFn = (color, size) => ({
  width: size,
  height: size,
  borderRadius: size * 0.22,
  background: `linear-gradient(180deg, ${lighten(color, 0.08)} 0%, ${color} 50%, ${darken(color, 0.1)} 100%)`,
  boxShadow: `inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -1px 1px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.2)`,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
});

const badgeFlat: BadgeStyleFn = (color, size) => ({
  width: size,
  height: size,
  borderRadius: "50%",
  background: color,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
});

const badgeBigSur: BadgeStyleFn = (color, size) => ({
  width: size,
  height: size,
  borderRadius: size * 0.22,
  background: color,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
});

const badgeLiquidGlass: BadgeStyleFn = (color, size) => ({
  width: size,
  height: size,
  borderRadius: size * 0.22,
  background: "rgba(255,255,255,0.2)",
  backdropFilter: "blur(14px) saturate(180%)",
  WebkitBackdropFilter: "blur(14px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.25)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: color, // Glyph inherits accent color
});

const badgeLiquidGlassDark: BadgeStyleFn = (color, size) => ({
  width: size,
  height: size,
  borderRadius: size * 0.22,
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(14px) saturate(180%)",
  WebkitBackdropFilter: "blur(14px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: color,
});

// ---------------------------------------------------------------------------
// Color utilities (simple hex manipulation)
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((c) => clamp(c).toString(16).padStart(2, "0")).join("")}`;
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount
  );
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

// ---------------------------------------------------------------------------
// Per-era icon set configuration
// ---------------------------------------------------------------------------

export interface EraIconSet {
  /** Badge style factory */
  badge: BadgeStyleFn;
  /** Dark mode badge override (if different from light) */
  badgeDark?: BadgeStyleFn;
  /** Small glyph set (sidebar, 24px badge) */
  glyphs: GlyphSet;
  /** Large glyph set (grid, 32px badge) — falls back to `glyphs` if absent */
  glyphsLarge?: GlyphSet;
}

/** Per-category accent colors (used by most eras for badge tinting) */
export const ICON_COLORS: Record<CategoryId, string> = {
  appearance: "#8E8E93",
  "desktop-dock": "#007AFF",
  windows: "#34C759",
  notifications: "#FF3B30",
  privacy: "#5856D6",
  accessibility: "#007AFF",
};

/** Aqua-era saturated palette */
const AQUA_COLORS: Record<CategoryId, string> = {
  appearance: "#FF9500",
  "desktop-dock": "#0066CC",
  windows: "#33CC33",
  notifications: "#CC3333",
  privacy: "#9933CC",
  accessibility: "#3366FF",
};

/** Skeuomorphic warmer tones */
const SKEU_COLORS: Record<CategoryId, string> = {
  appearance: "#8E8E93",
  "desktop-dock": "#4A90D9",
  windows: "#5DA84E",
  notifications: "#D94A4A",
  privacy: "#7B68AE",
  accessibility: "#4AA8A8",
};

/** Flat iOS 7 vibrant palette */
const FLAT_COLORS: Record<CategoryId, string> = {
  appearance: "#FF9500",
  "desktop-dock": "#007AFF",
  windows: "#4CD964",
  notifications: "#FF3B30",
  privacy: "#5856D6",
  accessibility: "#007AFF",
};

export const ERA_ICON_SETS: Record<EraId, EraIconSet> = {
  platinum: {
    badge: badgePlatinum,
    badgeDark: badgePlatinumDark,
    glyphs: platinumGlyphs,
  },
  aqua: {
    badge: badgeAqua,
    glyphs: aquaGlyphs,
  },
  skeuomorphic: {
    badge: badgeSkeuomorphic,
    glyphs: skeuomorphicGlyphs,
  },
  flat: {
    badge: badgeFlat,
    glyphs: flatGlyphs,
  },
  "big-sur": {
    badge: badgeBigSur,
    glyphs: bigSurGlyphs,
  },
  "liquid-glass": {
    badge: badgeLiquidGlass,
    badgeDark: badgeLiquidGlassDark,
    glyphs: liquidGlassGlyphs,
  },
};

/** Resolve the accent color for a given era + category */
export function getIconColor(era: EraId, categoryId: CategoryId): string {
  switch (era) {
    case "aqua":
      return AQUA_COLORS[categoryId];
    case "skeuomorphic":
      return SKEU_COLORS[categoryId];
    case "flat":
      return FLAT_COLORS[categoryId];
    default:
      return ICON_COLORS[categoryId];
  }
}

export type { GlyphSet } from "./types";
