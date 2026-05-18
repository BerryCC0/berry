/**
 * Render a palette-indexed pixel array to a PNG dataURL.
 *
 * Used by trait picker grids — a thumbnail is rendered once during catalog
 * construction and cached as a string for cheap React rendering.
 *
 * The default `scale` of 2 produces 64×64 thumbnails. Trait pickers typically
 * want 48–64px tiles; CSS scales further as needed.
 */

import { CANVAS_SIZE } from '../types';
import { pixelArrayToImageData, solidColorImageData } from './pixelArrayToImageData';

/**
 * Render a trait pixel array → PNG dataURL.
 *
 * Empty / SSR environments fall back to an empty 1×1 transparent PNG so picker
 * components don't blow up during server rendering.
 */
export function pixelArrayToThumbnail(
  pixels: number[],
  palette: string[],
  scale = 2,
): string {
  if (typeof document === 'undefined') return EMPTY_PNG;

  // First render the 32×32 source frame.
  const src = document.createElement('canvas');
  src.width = CANVAS_SIZE;
  src.height = CANVAS_SIZE;
  const srcCtx = src.getContext('2d', { willReadFrequently: false });
  if (!srcCtx) return EMPTY_PNG;
  srcCtx.putImageData(pixelArrayToImageData(pixels, palette), 0, 0);

  if (scale === 1) return src.toDataURL('image/png');

  // Then upscale with nearest-neighbor so pixels stay crisp.
  const dst = document.createElement('canvas');
  dst.width = CANVAS_SIZE * scale;
  dst.height = CANVAS_SIZE * scale;
  const dstCtx = dst.getContext('2d');
  if (!dstCtx) return EMPTY_PNG;
  dstCtx.imageSmoothingEnabled = false;
  dstCtx.drawImage(src, 0, 0, dst.width, dst.height);
  return dst.toDataURL('image/png');
}

/** Build a solid-color thumbnail — for backgrounds. */
export function solidColorThumbnail(color: string | null, scale = 2): string {
  if (typeof document === 'undefined') return EMPTY_PNG;
  const src = document.createElement('canvas');
  src.width = CANVAS_SIZE;
  src.height = CANVAS_SIZE;
  const srcCtx = src.getContext('2d');
  if (!srcCtx) return EMPTY_PNG;
  srcCtx.putImageData(solidColorImageData(color), 0, 0);

  if (scale === 1) return src.toDataURL('image/png');
  const dst = document.createElement('canvas');
  dst.width = CANVAS_SIZE * scale;
  dst.height = CANVAS_SIZE * scale;
  const dstCtx = dst.getContext('2d');
  if (!dstCtx) return EMPTY_PNG;
  dstCtx.imageSmoothingEnabled = false;
  dstCtx.drawImage(src, 0, 0, dst.width, dst.height);
  return dst.toDataURL('image/png');
}

const EMPTY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=';
