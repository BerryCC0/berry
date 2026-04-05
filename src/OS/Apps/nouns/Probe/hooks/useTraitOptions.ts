/**
 * useTraitOptions Hook
 * Extracts all available trait options from ImageData for filter dropdowns
 */

import { useMemo } from 'react';
import { ImageData } from '@/app/lib/nouns/utils/image-data';

export interface TraitOption {
  index: number;
  name: string;
}

export interface TraitOptions {
  backgrounds: TraitOption[];
  bodies: TraitOption[];
  accessories: TraitOption[];
  heads: TraitOption[];
  glasses: TraitOption[];
}

/**
 * Convert a filename to a display name
 * e.g. "head-green-snake" -> "Green Snake"
 */
function filenameToDisplayName(filename: string, prefix: string): string {
  let name = filename.replace(`${prefix}-`, '');
  // For glasses, also remove 'square-' prefix
  if (prefix === 'glasses') {
    name = name.replace('square-', '');
  }
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get all trait options for filter dropdowns
 * Memoized to avoid recomputing on every render
 */
export function useTraitOptions(): TraitOptions {
  return useMemo(() => {
    const bgLabels: Record<string, string> = {
      e1d7d5: 'Warm',
      d5d7e1: 'Cool',
    };

    const backgrounds: TraitOption[] = ImageData.bgcolors.map((hex, index) => ({
      index,
      name: bgLabels[hex] || `Color #${hex}`,
    }));

    const bodies: TraitOption[] = ImageData.images.bodies.map((item, index) => ({
      index,
      name: filenameToDisplayName(item.filename, 'body'),
    }));

    const accessories: TraitOption[] = ImageData.images.accessories.map((item, index) => ({
      index,
      name: filenameToDisplayName(item.filename, 'accessory'),
    }));

    const heads: TraitOption[] = ImageData.images.heads.map((item, index) => ({
      index,
      name: filenameToDisplayName(item.filename, 'head'),
    }));

    const glasses: TraitOption[] = ImageData.images.glasses.map((item, index) => ({
      index,
      name: filenameToDisplayName(item.filename, 'glasses'),
    }));

    return { backgrounds, bodies, accessories, heads, glasses };
  }, []);
}
