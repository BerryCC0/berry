/**
 * Shared loader for bundled Nouns traits.
 *
 * Dropdown previews use SVG data URLs, but editable Studio layers need real
 * 32x32 ImageData so tools can mutate pixels.
 */

import type { StudioLayerSource } from '@/app/lib/studio/types';
import type { NounPart } from '../types';
import {
  bundledBackgroundColor,
  decodeBundledTrait,
} from './decodeBundledTrait';
import {
  pixelArrayToImageData,
  solidColorImageData,
} from './pixelArrayToImageData';

export function imageDataForBundledTrait(
  part: NounPart,
  index: number,
  palette: string[],
): ImageData {
  if (part === 'background') {
    return solidColorImageData(bundledBackgroundColor(index));
  }

  const decoded = decodeBundledTrait(part, index);
  return pixelArrayToImageData(decoded.pixels, palette);
}

export function sourceForBundledTrait(index: number): StudioLayerSource {
  return {
    kind: 'fork-trait',
    traitIndex: index,
  };
}
