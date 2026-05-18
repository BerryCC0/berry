/**
 * On-chain trait decoder for Studio.
 *
 * Thin wrapper around the Camp artwork decoder. Given the compressed bytes
 * blob returned by `NounsDescriptorV3.heads(i)` / `.bodies(i)` / etc., produces
 * a 1024-pixel palette-indexed array suitable for `pixelArrayToImageData`.
 *
 * Backgrounds are handled separately because `Descriptor.backgrounds(i)`
 * returns a hex color string, not a bytes blob.
 */

import { decodeTrait } from '@/OS/Apps/nouns/Camp/utils/artwork/decoder';

export interface DecodedTrait {
  /** 1024 palette indices (row-major). */
  pixels: number[];
  /** Which descriptor palette this trait targets. */
  paletteIndex: number;
}

/** Decode a head/body/accessory/glasses bytes blob from the Descriptor. */
export function decodeRleTrait(compressedBytes: `0x${string}`): DecodedTrait {
  return decodeTrait(compressedBytes);
}

/**
 * Normalize a background string from `Descriptor.backgrounds(i)`.
 * The on-chain value is a 6-char hex like `"e1d7d5"` (no `#` prefix).
 */
export function normalizeBackgroundColor(value: string): string {
  const clean = value.startsWith('#') ? value.slice(1) : value;
  return `#${clean.toLowerCase()}`;
}
