/**
 * Compose a 5-layer Noun into a PNG data URL.
 *
 * Used for project thumbnails in the gallery and for "Submit to Camp"
 * previews. The output dimensions default to 128×128 (4× nominal),
 * preserving crisp pixels via nearest-neighbor scaling.
 */

import {
  CANVAS_SIZE,
  NOUN_PARTS,
  type NounPart,
} from '../types';

export interface ComposeThumbnailOptions {
  /** Output size in CSS px. Default 128. */
  size?: number;
  /** Background color drawn beneath the composite (or null for transparent). */
  background?: string | null;
}

/** Stitch the 5 layer canvases (z-order) into a PNG dataURL. SSR-safe. */
export function composeThumbnail(
  canvases: Record<NounPart, HTMLCanvasElement>,
  options?: ComposeThumbnailOptions,
): string {
  if (typeof document === 'undefined') return '';
  const size = options?.size ?? 128;
  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  const ctx = out.getContext('2d');
  if (!ctx) return '';
  ctx.imageSmoothingEnabled = false;

  // Background: transparent by default; SubmitToCamp uses solid colors.
  if (options?.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, size, size);
  } else {
    ctx.clearRect(0, 0, size, size);
  }

  for (const part of NOUN_PARTS) {
    const layer = canvases[part];
    if (!layer) continue;
    // Skip empty canvases — drawing them is harmless but cheap to guard.
    ctx.drawImage(layer, 0, 0, CANVAS_SIZE, CANVAS_SIZE, 0, 0, size, size);
  }

  return out.toDataURL('image/png');
}
