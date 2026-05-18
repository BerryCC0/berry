/**
 * Bucket tool — iterative 4-direction flood fill.
 * Algorithmic structure inspired by Noundry Studio (CC0); reimplemented as
 * iterative + raw RGBA comparison (no `colord` dep).
 */

import { useBrush } from '../model/brush';
import type { Tool } from '../types';
import { floodFill, parseHex, singlePixelPreview } from './helpers';

export const bucketTool: Tool = {
  id: 'bucket',
  name: 'Bucket',
  shortcut: 'G',
  onPointerDown(point, ctx) {
    const { color } = useBrush.getState();
    const { r, g, b, a } = parseHex(color);
    const c = ctx.canvas.getContext('2d', { willReadFrequently: true })!;
    floodFill(c, point, r, g, b, a);
    ctx.commit();
  },
  onPointerMove() {
    /* one-shot */
  },
  onPointerUp() {
    /* one-shot */
  },
  hoverPreview(point, overlayCtx) {
    singlePixelPreview(overlayCtx, point);
  },
};
