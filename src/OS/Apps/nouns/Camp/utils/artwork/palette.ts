/**
 * Palette utilities for Berry Studio artwork encoding.
 *
 * Attribution: algorithmic reference taken from Noundry's CC0-licensed
 * artworkEncoding.ts (https://github.com/volkyeth/noundry — apps/gallery/
 * src/app/propose/artworkEncoding.ts). Clean-room TypeScript reimplementation.
 *
 * The on-chain Nouns descriptor stores palettes as flat arrays of RGB tuples,
 * where index 0 is always reserved for transparency. This module helps map
 * arbitrary #rrggbb colors into the closest palette index.
 */

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Normalize a hex color string to lowercase #rrggbb (no alpha).
 * Accepts: "0xrrggbb", "#rrggbb", "#rrggbbaa", "rrggbb", etc.
 */
function normalizeHex6(hex: string): string {
  let h = hex.trim().toLowerCase();
  if (h.startsWith("0x")) h = h.slice(2);
  if (h.startsWith("#")) h = h.slice(1);
  if (h.length === 8) h = h.slice(0, 6); // strip alpha
  if (h.length === 3) {
    // expand shorthand #abc → #aabbcc
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return `#${h}`;
}

/**
 * Build a lookup of #rrggbb → palette index. The input array's order is
 * preserved. Colors are normalized to lowercase #rrggbb so callers don't have
 * to worry about casing.
 */
export function buildPaletteDict(palette: string[]): Map<string, number> {
  const dict = new Map<string, number>();
  for (let i = 0; i < palette.length; i++) {
    dict.set(normalizeHex6(palette[i]), i);
  }
  return dict;
}

/**
 * Convert 0xRRGGBB / #RRGGBB / #RRGGBBAA to {r,g,b,a}. Alpha defaults to 255
 * if not provided.
 */
export function parseHexColor(hex: string): RGBA {
  let h = hex.trim().toLowerCase();
  if (h.startsWith("0x")) h = h.slice(2);
  if (h.startsWith("#")) h = h.slice(1);
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length !== 6 && h.length !== 8) {
    throw new Error(`parseHexColor: invalid hex color "${hex}"`);
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255;
  if ([r, g, b, a].some((v) => Number.isNaN(v))) {
    throw new Error(`parseHexColor: invalid hex color "${hex}"`);
  }
  return { r, g, b, a };
}

/**
 * Find the closest palette color to a given color via Euclidean distance in
 * RGB space.
 *
 * Important: this never returns 0 (the transparent slot) unless the input is
 * itself fully transparent. Callers painting visible pixels should never have
 * their color silently snapped to "transparent."
 */
export function nearestPaletteIndex(color: string, palette: string[]): number {
  const target = parseHexColor(color);

  // Treat fully-transparent input as palette index 0 directly.
  if (target.a === 0) return 0;

  // If the exact color is already in the palette (skipping index 0), return it.
  const dict = buildPaletteDict(palette);
  const exact = dict.get(normalizeHex6(color));
  if (exact !== undefined && exact !== 0) return exact;

  let bestIndex = -1;
  let bestDistSq = Infinity;
  for (let i = 1; i < palette.length; i++) {
    const p = parseHexColor(palette[i]);
    const dr = p.r - target.r;
    const dg = p.g - target.g;
    const db = p.b - target.b;
    const distSq = dr * dr + dg * dg + db * db;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestIndex = i;
    }
  }

  // If the palette has only one entry (index 0 = transparent), fall back to
  // index 0; callers should validate their palette has visible colors.
  return bestIndex === -1 ? 0 : bestIndex;
}
