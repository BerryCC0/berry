/**
 * Palette Color Utilities
 * Builds a mapping from each palette color to the trait indices that use it.
 * Used for the COLOR filter which finds Nouns containing a specific palette color.
 */

import { ImageData } from '@/app/lib/nouns/utils/image-data';

/**
 * Set of trait indices that contain a given palette color,
 * keyed by trait type.
 */
export interface ColorTraitSets {
  bodies: Set<number>;
  accessories: Set<number>;
  heads: Set<number>;
  glasses: Set<number>;
}

/**
 * Parse a trait part's encoded data to extract the palette indices it uses.
 */
function extractPaletteIndices(part: { data: string }): Set<number> {
  const indices = new Set<number>();
  const data = part.data.replace(/^0x/, '');
  // Skip the first 10 hex chars (bounds header: top, right, bottom, left, width)
  const rects = data.substring(10);
  const pairs = rects.match(/.{1,4}/g) || [];
  for (const pair of pairs) {
    // Each 4-char chunk: 2 chars length, 2 chars color index
    const colorIndex = parseInt(pair.substring(2, 4), 16);
    if (colorIndex !== 0) {
      // 0 = transparent, skip
      indices.add(colorIndex);
    }
  }
  return indices;
}

/**
 * For each palette color index, which trait indices (per type) use it.
 * Computed once and cached.
 */
let _colorMap: Map<number, ColorTraitSets> | null = null;

function buildColorMap(): Map<number, ColorTraitSets> {
  if (_colorMap) return _colorMap;

  const map = new Map<number, ColorTraitSets>();

  function ensureEntry(colorIdx: number): ColorTraitSets {
    let entry = map.get(colorIdx);
    if (!entry) {
      entry = {
        bodies: new Set(),
        accessories: new Set(),
        heads: new Set(),
        glasses: new Set(),
      };
      map.set(colorIdx, entry);
    }
    return entry;
  }

  // Process each trait type
  const collections = [
    { key: 'bodies' as const, items: ImageData.images.bodies },
    { key: 'accessories' as const, items: ImageData.images.accessories },
    { key: 'heads' as const, items: ImageData.images.heads },
    { key: 'glasses' as const, items: ImageData.images.glasses },
  ];

  for (const { key, items } of collections) {
    items.forEach((part, traitIndex) => {
      const paletteIndices = extractPaletteIndices(part);
      for (const colorIdx of paletteIndices) {
        const entry = ensureEntry(colorIdx);
        entry[key].add(traitIndex);
      }
    });
  }

  _colorMap = map;
  return map;
}

/**
 * Get all unique palette colors as options for the COLOR filter.
 * Returns objects with the palette index and hex value, sorted by hex.
 * Skips index 0 (transparent).
 */
export function getPaletteColorOptions(): { index: number; hex: string }[] {
  const seen = new Set<string>();
  const options: { index: number; hex: string }[] = [];

  for (let i = 1; i < ImageData.palette.length; i++) {
    const hex = ImageData.palette[i];
    if (hex && !seen.has(hex)) {
      seen.add(hex);
      options.push({ index: i, hex });
    }
  }

  return options;
}

/**
 * Check if a noun (by its trait indices) contains a given palette color.
 */
export function nounContainsColor(
  noun: { background: number; body: number; accessory: number; head: number; glasses: number },
  paletteColorIndex: number
): boolean {
  // Check background: background colors are separate from the palette.
  // The palette color doesn't apply to backgrounds (they use bgcolors array).
  // So we only check body/accessory/head/glasses parts.

  const colorMap = buildColorMap();
  const entry = colorMap.get(paletteColorIndex);
  if (!entry) return false;

  return (
    entry.bodies.has(noun.body) ||
    entry.accessories.has(noun.accessory) ||
    entry.heads.has(noun.head) ||
    entry.glasses.has(noun.glasses)
  );
}
