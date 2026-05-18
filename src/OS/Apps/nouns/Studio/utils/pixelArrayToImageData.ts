/**
 * Convert a palette-indexed pixel array → ImageData ready for `putImageData`.
 *
 * Used by Fork / Open flows to push a decoded trait onto a layer canvas via
 * `useLayers.loadImageData(part, imageData)`.
 *
 * The palette is the on-chain Descriptor palette (`Color[]`, hex strings). The
 * special index `0` is transparent. Missing palette entries are also treated
 * as transparent so we never crash on a malformed input.
 */

import { CANVAS_SIZE, type Color } from '../types';

const TOTAL_PIXELS = CANVAS_SIZE * CANVAS_SIZE;

function parseHex6(hex: string): { r: number; g: number; b: number } {
  let h = hex.trim().toLowerCase();
  if (h.startsWith('#')) h = h.slice(1);
  if (h.startsWith('0x')) h = h.slice(2);
  if (h.length === 8) h = h.slice(0, 6);
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (h.length !== 6) return { r: 0, g: 0, b: 0 };
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return {
    r: Number.isNaN(r) ? 0 : r,
    g: Number.isNaN(g) ? 0 : g,
    b: Number.isNaN(b) ? 0 : b,
  };
}

/**
 * Build a 32×32 ImageData from a palette-indexed pixel array.
 *
 * @param pixels - 1024 palette indices (row-major). Index 0 = transparent.
 * @param palette - Descriptor palette. `palette[0]` is treated as transparent
 *   regardless of its actual value.
 */
export function pixelArrayToImageData(
  pixels: number[],
  palette: Color[],
): ImageData {
  if (pixels.length !== TOTAL_PIXELS) {
    throw new Error(
      `pixelArrayToImageData: expected ${TOTAL_PIXELS} pixels, got ${pixels.length}`,
    );
  }

  // Pre-resolve palette → RGBA bytes. Index 0 is always transparent.
  const lookup = new Array<[number, number, number, number]>(palette.length);
  for (let i = 0; i < palette.length; i++) {
    if (i === 0 || !palette[i]) {
      lookup[i] = [0, 0, 0, 0];
    } else {
      const { r, g, b } = parseHex6(palette[i]);
      lookup[i] = [r, g, b, 255];
    }
  }

  const out = new Uint8ClampedArray(TOTAL_PIXELS * 4);
  for (let i = 0; i < TOTAL_PIXELS; i++) {
    const idx = pixels[i];
    const rgba = lookup[idx] ?? [0, 0, 0, 0];
    const o = i * 4;
    out[o] = rgba[0];
    out[o + 1] = rgba[1];
    out[o + 2] = rgba[2];
    out[o + 3] = rgba[3];
  }

  return new ImageData(out, CANVAS_SIZE, CANVAS_SIZE);
}

/**
 * Build an ImageData filled with a single solid color — used for backgrounds.
 * Pass an `undefined`/empty color to produce a transparent canvas.
 */
export function solidColorImageData(color: Color | null | undefined): ImageData {
  const out = new Uint8ClampedArray(TOTAL_PIXELS * 4);
  if (!color) {
    return new ImageData(out, CANVAS_SIZE, CANVAS_SIZE);
  }
  const { r, g, b } = parseHex6(color);
  for (let i = 0; i < TOTAL_PIXELS; i++) {
    const o = i * 4;
    out[o] = r;
    out[o + 1] = g;
    out[o + 2] = b;
    out[o + 3] = 255;
  }
  return new ImageData(out, CANVAS_SIZE, CANVAS_SIZE);
}
