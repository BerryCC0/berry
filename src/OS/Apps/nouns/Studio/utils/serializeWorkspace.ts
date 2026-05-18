/**
 * Convert in-memory Studio state (layer canvases + palette) into the shape
 * the `/api/studio/projects` endpoint expects, and back.
 *
 * Pixels are stored as palette indices (length 1024) rather than RGBA so the
 * row stays small (~5 KB per project) and bytes line up with how on-chain
 * traits are stored.
 */

import {
  CANVAS_SIZE,
  NOUN_PARTS,
  TOTAL_PIXELS,
  type NounPart,
} from '../types';
import type {
  StudioLayerData,
  StudioProject,
  TraitType,
} from '@/app/lib/studio/types';
import { pixelArrayToImageData } from './pixelArrayToImageData';

/** A NounPart is identical to a TraitType in the DB schema. */
type Layer = StudioLayerData;

function parseHex6(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.trim().toLowerCase();
  if (h.startsWith('#')) h = h.slice(1);
  if (h.length === 8) h = h.slice(0, 6);
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)
    ? null
    : { r, g, b };
}

/**
 * Convert one 32×32 layer canvas → palette-indexed pixel array.
 *
 * Approach: build an RGB→index map from the snapshot palette, then walk the
 * pixels. Any color not in the palette gets nearest-color matched. Fully
 * transparent pixels map to index 0.
 */
function canvasToPixelArray(
  canvas: HTMLCanvasElement,
  palette: string[],
): number[] {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return new Array(TOTAL_PIXELS).fill(0);
  const data = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;

  // Build a direct RGB → index map; the on-chain palette is small.
  const direct = new Map<number, number>();
  const paletteRgb: Array<{ r: number; g: number; b: number; i: number }> = [];
  for (let i = 0; i < palette.length; i++) {
    if (i === 0) continue;
    const rgb = parseHex6(palette[i] ?? '');
    if (!rgb) continue;
    const key = (rgb.r << 16) | (rgb.g << 8) | rgb.b;
    direct.set(key, i);
    paletteRgb.push({ ...rgb, i });
  }

  const out = new Array<number>(TOTAL_PIXELS);
  for (let p = 0; p < TOTAL_PIXELS; p++) {
    const o = p * 4;
    const a = data[o + 3];
    if (a < 8) {
      out[p] = 0;
      continue;
    }
    const key = (data[o] << 16) | (data[o + 1] << 8) | data[o + 2];
    const direct_ = direct.get(key);
    if (direct_ !== undefined) {
      out[p] = direct_;
      continue;
    }
    // Nearest-color fallback (euclidean in RGB).
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < paletteRgb.length; i++) {
      const pe = paletteRgb[i];
      const dr = pe.r - data[o];
      const dg = pe.g - data[o + 1];
      const db = pe.b - data[o + 2];
      const d = dr * dr + dg * dg + db * db;
      if (d < bestDist) {
        bestDist = d;
        best = pe.i;
      }
    }
    out[p] = best;
  }
  return out;
}

/**
 * Build the `layers` object for the create/update payload.
 *
 * @param canvases - Live canvases keyed by NounPart (from useLayers.getCanvases)
 * @param palette - Descriptor palette snapshot at save time
 * @param meta - Per-part flags (edited, source); defaults: edited=true if
 *               any non-transparent pixel exists.
 */
export function serializeLayers(
  canvases: Record<NounPart, HTMLCanvasElement>,
  palette: string[],
  meta?: Partial<Record<NounPart, { edited?: boolean; source?: Layer['source'] }>>,
): Record<TraitType, StudioLayerData> {
  const out = {} as Record<TraitType, StudioLayerData>;
  for (const part of NOUN_PARTS) {
    const pixels = canvasToPixelArray(canvases[part], palette);
    const edited =
      meta?.[part]?.edited ?? pixels.some((p, i) => p !== 0 || i === -1);
    out[part as TraitType] = {
      paletteIndex: 0,
      pixels,
      edited,
      source: meta?.[part]?.source,
    };
  }
  return out;
}

/**
 * Hydrate a saved project's layers into ImageData ready for
 * `useLayers.loadImageData(part, imageData)`.
 */
export function deserializeLayers(
  project: StudioProject,
): Record<NounPart, ImageData> {
  const out = {} as Record<NounPart, ImageData>;
  for (const part of NOUN_PARTS) {
    const layer = project.layers[part as TraitType];
    if (!layer) {
      out[part] = new ImageData(CANVAS_SIZE, CANVAS_SIZE);
      continue;
    }
    out[part] = pixelArrayToImageData(layer.pixels, project.paletteSnapshot);
  }
  return out;
}
