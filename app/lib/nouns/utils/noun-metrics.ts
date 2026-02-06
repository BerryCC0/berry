/**
 * Noun Metrics Utilities
 * Computes area, color count, and brightness for a Noun from its trait seed.
 * Used by the backfill script, cron sync, and Probe sort filters.
 *
 * RLE format per trait part:
 *   - First 10 hex chars: bounds header (top, right, bottom, left, width)
 *   - Remaining: 4-char chunks — 2 chars run length, 2 chars palette color index
 *   - Color index 0 = transparent
 */

import { ImageData } from './image-data';

export interface NounSeed {
  background: number;
  body: number;
  accessory: number;
  head: number;
  glasses: number;
}

/**
 * Parse a single trait part's RLE data into run-length entries.
 * Returns array of { length, colorIndex } for non-transparent pixels.
 */
function parseRuns(part: { data: string }): { length: number; colorIndex: number }[] {
  const data = part.data.replace(/^0x/, '');
  const rects = data.substring(10); // skip bounds header
  const chunks = rects.match(/.{1,4}/g) || [];
  const runs: { length: number; colorIndex: number }[] = [];

  for (const chunk of chunks) {
    const length = parseInt(chunk.substring(0, 2), 16);
    const colorIndex = parseInt(chunk.substring(2, 4), 16);
    if (colorIndex !== 0) {
      runs.push({ length, colorIndex });
    }
  }

  return runs;
}

/**
 * Get the 4 trait parts for a noun seed.
 */
function getTraitParts(seed: NounSeed) {
  return [
    ImageData.images.bodies[seed.body],
    ImageData.images.accessories[seed.accessory],
    ImageData.images.heads[seed.head],
    ImageData.images.glasses[seed.glasses],
  ].filter(Boolean);
}

/**
 * Compute the visual area of a Noun — total non-transparent pixels
 * across all trait parts (body, accessory, head, glasses).
 */
export function computeNounArea(seed: NounSeed): number {
  const parts = getTraitParts(seed);
  let area = 0;

  for (const part of parts) {
    const runs = parseRuns(part);
    for (const run of runs) {
      area += run.length;
    }
  }

  return area;
}

/**
 * Compute the number of unique non-transparent palette colors
 * used across all trait parts of a Noun.
 */
export function computeNounColorCount(seed: NounSeed): number {
  const parts = getTraitParts(seed);
  const uniqueColors = new Set<number>();

  for (const part of parts) {
    const runs = parseRuns(part);
    for (const run of runs) {
      uniqueColors.add(run.colorIndex);
    }
  }

  return uniqueColors.size;
}

/**
 * Parse a 6-char hex color string to RGB values.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return { r, g, b };
}

/**
 * Compute perceived brightness (0-255) using the standard luminance formula.
 */
function colorBrightness(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

/**
 * Compute the average perceived brightness (0-255) of a Noun,
 * averaged across all unique non-transparent palette colors used in its traits.
 * Also includes the background color.
 */
export function computeNounBrightness(seed: NounSeed): number {
  const parts = getTraitParts(seed);
  const uniqueColors = new Set<number>();

  for (const part of parts) {
    const runs = parseRuns(part);
    for (const run of runs) {
      uniqueColors.add(run.colorIndex);
    }
  }

  // Collect brightness values from unique palette colors
  const brightnessValues: number[] = [];

  // Include background color
  const bgHex = ImageData.bgcolors[seed.background];
  if (bgHex) {
    brightnessValues.push(colorBrightness(bgHex));
  }

  // Include trait colors
  for (const colorIdx of uniqueColors) {
    const hex = ImageData.palette[colorIdx];
    if (hex) {
      brightnessValues.push(colorBrightness(hex));
    }
  }

  if (brightnessValues.length === 0) return 128; // fallback mid-range

  const sum = brightnessValues.reduce((a, b) => a + b, 0);
  return Math.round(sum / brightnessValues.length);
}

/**
 * Compute all three metrics at once (more efficient than calling each separately).
 */
export function computeAllNounMetrics(seed: NounSeed): {
  area: number;
  color_count: number;
  brightness: number;
} {
  const parts = getTraitParts(seed);
  let area = 0;
  const uniqueColors = new Set<number>();

  for (const part of parts) {
    const runs = parseRuns(part);
    for (const run of runs) {
      area += run.length;
      uniqueColors.add(run.colorIndex);
    }
  }

  // Brightness
  const brightnessValues: number[] = [];
  const bgHex = ImageData.bgcolors[seed.background];
  if (bgHex) {
    brightnessValues.push(colorBrightness(bgHex));
  }
  for (const colorIdx of uniqueColors) {
    const hex = ImageData.palette[colorIdx];
    if (hex) {
      brightnessValues.push(colorBrightness(hex));
    }
  }
  const brightness =
    brightnessValues.length > 0
      ? Math.round(brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length)
      : 128;

  return {
    area,
    color_count: uniqueColors.size,
    brightness,
  };
}
