/**
 * Bundled-trait decoder.
 *
 * Berry ships a static snapshot of every current on-chain trait at
 * `app/lib/nouns/utils/image-data.ts` (~64KB). Unlike the on-chain Descriptor
 * blobs (which are deflate-compressed + ABI-wrapped), the bundled entries store
 * the *uncompressed* artwork bytes directly:
 *
 *   [paletteIndex][top][right][bottom][left] + RLE pairs
 *
 * This file decodes one bundled entry → palette-indexed 32×32 pixel array.
 * It also exposes `bundledTraitCount(part)` for picker UIs.
 */

import { ImageData as NounsImageData } from '@/app/lib/nouns/utils/image-data';
import { rleDecode } from '@/OS/Apps/nouns/Camp/utils/artwork/decoder';
import { CANVAS_SIZE, type NounPart } from '../types';

const TRANSPARENT = 0;
const TOTAL_PIXELS = CANVAS_SIZE * CANVAS_SIZE;

export interface BundledTraitEntry {
  index: number;
  filename: string;
  /** 1024 palette indices (row-major). */
  pixels: number[];
  /** Which descriptor palette this trait targets (typically 0). */
  paletteIndex: number;
}

/** The 5 NounPart values mapped to keys of `ImageData.images`. */
type ImagePartKey = 'bodies' | 'accessories' | 'heads' | 'glasses';

const IMAGES_KEY: Record<Exclude<NounPart, 'background'>, ImagePartKey> = {
  body: 'bodies',
  accessory: 'accessories',
  head: 'heads',
  glasses: 'glasses',
};

/** Synchronous trait count for the given part from the bundled snapshot. */
export function bundledTraitCount(part: NounPart): number {
  if (part === 'background') return NounsImageData.bgcolors.length;
  return NounsImageData.images[IMAGES_KEY[part]].length;
}

/**
 * Reconstruct a 32×32 pixel array from cropped RLE pixels + bounds.
 * Mirrors the unpacker used by the on-chain decoder; `right` is exclusive.
 */
function unpackBoundedPixels(
  bounded: number[],
  bounds: { top: number; right: number; bottom: number; left: number },
): number[] {
  const { top, right, bottom, left } = bounds;
  const rightInclusive = right - 1;

  const out = new Array<number>(TOTAL_PIXELS).fill(TRANSPARENT);
  if (bounded.length === 0) return out;

  const rowWidth = rightInclusive - left + 1;
  for (let r = 0; r <= bottom - top; r++) {
    for (let c = 0; c < rowWidth; c++) {
      const pixel = bounded[r * rowWidth + c];
      const idx = (top + r) * CANVAS_SIZE + (left + c);
      out[idx] = pixel;
    }
  }
  return out;
}

/**
 * Decode one trait from the bundled image-data snapshot.
 *
 * Backgrounds are special: they're flat hex color strings, not bitmaps. We
 * encode them as a full canvas of palette index 1 (after temporarily injecting
 * the color into a synthetic palette). For Studio's purposes a background
 * picker should just paint the chosen color across the layer — callers
 * resolving palettes should use `bundledBackgroundColor()` directly.
 */
export function decodeBundledTrait(part: NounPart, index: number): BundledTraitEntry {
  if (part === 'background') {
    const color = NounsImageData.bgcolors[index];
    if (color === undefined) {
      throw new Error(`decodeBundledTrait: background index ${index} out of range`);
    }
    return {
      index,
      filename: `background-${color}`,
      // Backgrounds aren't palette-indexed in the bundle. We return a sentinel
      // pixel array of zeros; callers should special-case backgrounds via
      // `bundledBackgroundColor()` rather than rendering this through the
      // descriptor palette.
      pixels: new Array<number>(TOTAL_PIXELS).fill(0),
      paletteIndex: 0,
    };
  }

  const entry = NounsImageData.images[IMAGES_KEY[part]][index];
  if (!entry) {
    throw new Error(`decodeBundledTrait: ${part} index ${index} out of range`);
  }

  const hex = entry.data.startsWith('0x') ? entry.data.slice(2) : entry.data;
  if (hex.length < 10) {
    throw new Error(`decodeBundledTrait: artwork blob too short for ${entry.filename}`);
  }

  const paletteIndex = parseInt(hex.slice(0, 2), 16);
  const top = parseInt(hex.slice(2, 4), 16);
  const right = parseInt(hex.slice(4, 6), 16);
  const bottom = parseInt(hex.slice(6, 8), 16);
  const left = parseInt(hex.slice(8, 10), 16);

  const bounded = rleDecode(hex.slice(10));
  const pixels = unpackBoundedPixels(bounded, { top, right, bottom, left });

  return {
    index,
    filename: entry.filename,
    pixels,
    paletteIndex,
  };
}

/** Returns the `#rrggbb` color string for a bundled background index. */
export function bundledBackgroundColor(index: number): string | null {
  const color = NounsImageData.bgcolors[index];
  return color ? `#${color}` : null;
}
