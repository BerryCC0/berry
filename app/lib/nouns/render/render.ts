/**
 * Noun Rendering Functions
 * Uses utils for SVG building and trait names
 */

import { ImageData } from '../utils/image-data';
import { buildSVG } from '../utils/svg-builder';
import { getTraitName as getTraitNameUtil, type TraitType } from '../utils/trait-name-utils';
import type { NounSeed } from './types';

// Re-export TraitType
export { type TraitType } from '../utils/trait-name-utils';

// Track if image data is loaded (it's always loaded since it's static)
let _imageDataLoaded = true;

/**
 * Check if image data is loaded
 */
export function isImageDataLoaded(): boolean {
  return _imageDataLoaded;
}

/**
 * Load image data (no-op since it's static, but kept for API compatibility)
 */
export async function loadImageData(): Promise<void> {
  _imageDataLoaded = true;
}

/**
 * Render a Noun as an SVG string from its seed
 */
export function renderNounSVG(seed: NounSeed): string {
  const { background, body, accessory, head, glasses } = seed;

  // Get background color
  const bgColor = `#${ImageData.bgcolors[background] || 'd5d7e1'}`;

  // Get trait image data
  const parts = [
    ImageData.images.bodies[body],
    ImageData.images.accessories[accessory],
    ImageData.images.heads[head],
    ImageData.images.glasses[glasses],
  ].filter(Boolean);

  // Get palette colors with # prefix
  const paletteColors = ImageData.palette.map(c => c ? `#${c}` : 'transparent');

  // Build SVG
  return buildSVG(parts, paletteColors, bgColor);
}

/**
 * Get a Noun image as a data URL
 */
export function getNounDataUrl(seed: NounSeed): string {
  const svg = renderNounSVG(seed);
  // Use encodeURIComponent for better compatibility
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Get the display name for a trait
 */
export function getTraitName(type: TraitType, value: number): string {
  return getTraitNameUtil(type, value);
}

/**
 * Get all trait names for a Noun
 */
export function getNounTraits(seed: NounSeed): Record<TraitType, string> {
  return {
    background: getTraitName('background', seed.background),
    body: getTraitName('body', seed.body),
    accessory: getTraitName('accessory', seed.accessory),
    head: getTraitName('head', seed.head),
    glasses: getTraitName('glasses', seed.glasses),
  };
}

