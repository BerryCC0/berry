/**
 * Trait Image Utilities
 * Generates SVG data URLs for individual Noun trait parts
 * Used to show preview thumbnails in filter dropdowns
 */

import { ImageData } from '@/app/lib/nouns/utils/image-data';
import { buildSVG } from '@/app/lib/nouns/utils/svg-builder';
import type { TraitType } from '@/app/lib/nouns/utils/trait-name-utils';

/**
 * Cache for generated trait image data URLs
 */
const traitImageCache = new Map<string, string>();

/**
 * Generate a data URL for a single trait part rendered as an SVG.
 * Uses a transparent background so only the trait part is visible.
 */
export function getTraitImageUrl(type: TraitType, index: number): string {
  const cacheKey = `${type}-${index}`;
  const cached = traitImageCache.get(cacheKey);
  if (cached) return cached;

  if (type === 'background') {
    // Backgrounds are just solid colors — render a simple colored square
    const hex = ImageData.bgcolors[index] || 'd5d7e1';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="4" fill="#${hex}"/></svg>`;
    const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    traitImageCache.set(cacheKey, url);
    return url;
  }

  // Map trait type to image collection
  const collections: Record<string, typeof ImageData.images.bodies> = {
    body: ImageData.images.bodies,
    accessory: ImageData.images.accessories,
    head: ImageData.images.heads,
    glasses: ImageData.images.glasses,
  };

  const collection = collections[type];
  if (!collection || index >= collection.length) return '';

  const part = collection[index];
  const paletteColors = ImageData.palette.map((c) => (c ? `#${c}` : 'transparent'));

  // Build SVG with just this one part on a transparent background
  const svg = buildSVG([part], paletteColors, 'transparent');
  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  traitImageCache.set(cacheKey, url);
  return url;
}
