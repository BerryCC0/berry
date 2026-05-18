/**
 * Catalog of bundled traits + their pre-rendered thumbnails.
 *
 * The bundle (app/lib/nouns/utils/image-data.ts) is static, so the catalog is
 * computed once per session. We lazily render thumbnails the first time
 * `useBundledTraits()` is called inside the browser — SSR returns empty arrays
 * to keep this hook side-effect-free outside the DOM.
 */

'use client';

import { useMemo } from 'react';
import { ImageData as NounsImageData } from '@/app/lib/nouns/utils/image-data';
import {
  bundledBackgroundColor,
  bundledTraitCount,
  decodeBundledTrait,
} from '../utils/decodeBundledTrait';
import {
  pixelArrayToThumbnail,
  solidColorThumbnail,
} from '../utils/pixelArrayToThumbnail';
import type { NounPart } from '../types';

export interface BundledTraitMeta {
  index: number;
  filename: string;
  thumbnailDataUrl: string;
}

export interface BundledTraitCatalog {
  background: BundledTraitMeta[];
  body: BundledTraitMeta[];
  accessory: BundledTraitMeta[];
  head: BundledTraitMeta[];
  glasses: BundledTraitMeta[];
  palette: string[];
}

let CACHED: BundledTraitCatalog | null = null;

function buildCatalog(): BundledTraitCatalog {
  if (typeof document === 'undefined') {
    // Stay side-effect-free on the server; pickers render only in the client.
    return {
      background: [],
      body: [],
      accessory: [],
      head: [],
      glasses: [],
      palette: NounsImageData.palette,
    };
  }

  const palette = NounsImageData.palette;

  const buildPart = (part: Exclude<NounPart, 'background'>): BundledTraitMeta[] => {
    const count = bundledTraitCount(part);
    const out: BundledTraitMeta[] = new Array(count);
    for (let i = 0; i < count; i++) {
      const decoded = decodeBundledTrait(part, i);
      out[i] = {
        index: i,
        filename: decoded.filename,
        thumbnailDataUrl: pixelArrayToThumbnail(decoded.pixels, palette, 2),
      };
    }
    return out;
  };

  const backgrounds: BundledTraitMeta[] = NounsImageData.bgcolors.map(
    (color, i) => ({
      index: i,
      filename: `background-${color}`,
      thumbnailDataUrl: solidColorThumbnail(bundledBackgroundColor(i), 2),
    }),
  );

  return {
    background: backgrounds,
    body: buildPart('body'),
    accessory: buildPart('accessory'),
    head: buildPart('head'),
    glasses: buildPart('glasses'),
    palette,
  };
}

/** Memoized; the bundle is static so we only ever build the catalog once. */
export function useBundledTraits(): BundledTraitCatalog {
  return useMemo(() => {
    if (!CACHED) CACHED = buildCatalog();
    return CACHED;
  }, []);
}
