/**
 * Trait image utilities.
 *
 * Generates small SVG data URLs for individual Noun trait parts. These are
 * preview-only assets for dropdowns and filters; Studio still decodes bundled
 * trait pixels separately before loading them into editable canvases.
 */

import { ImageData } from './image-data';
import { buildSVG } from './svg-builder';
import type { TraitType } from './trait-name-utils';

const traitImageCache = new Map<string, string>();

export function getTraitImageUrl(type: TraitType, index: number): string {
  const cacheKey = `${type}-${index}`;
  const cached = traitImageCache.get(cacheKey);
  if (cached) return cached;

  if (type === 'background') {
    const hex = ImageData.bgcolors[index] || 'd5d7e1';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="4" fill="#${hex}"/></svg>`;
    const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    traitImageCache.set(cacheKey, url);
    return url;
  }

  const collections = {
    body: ImageData.images.bodies,
    accessory: ImageData.images.accessories,
    head: ImageData.images.heads,
    glasses: ImageData.images.glasses,
  };

  const collection = collections[type];
  if (!collection || index >= collection.length) return '';

  const part = collection[index];
  const paletteColors = ImageData.palette.map((c) =>
    c ? `#${c}` : 'transparent',
  );
  const svg = buildSVG([part], paletteColors, 'transparent');
  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  traitImageCache.set(cacheKey, url);
  return url;
}
