/**
 * Move tool — translates the entire active layer's pixels by the dragged
 * offset. Snapshot on pointer-down, then on each move, redraw the snapshot
 * translated by (dx, dy) and clear the original.
 *
 * Pixels that move off-canvas are clipped.
 */

import type { Point, Tool } from '../types';
import { CANVAS_SIZE } from '../types';

let startPoint: Point | null = null;
let snapshot: ImageData | null = null;

export const moveTool: Tool = {
  id: 'move',
  name: 'Move',
  shortcut: 'V',
  onPointerDown(point, ctx) {
    const c = ctx.canvas.getContext('2d', { willReadFrequently: true })!;
    snapshot = c.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    startPoint = point;
  },
  onPointerMove(point, ctx) {
    if (!startPoint || !snapshot) return;
    const dx = point.x - startPoint.x;
    const dy = point.y - startPoint.y;
    const c = ctx.canvas.getContext('2d', { willReadFrequently: true })!;
    c.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    // Composite the snapshot, translated.
    const tmp = document.createElement('canvas');
    tmp.width = CANVAS_SIZE;
    tmp.height = CANVAS_SIZE;
    tmp.getContext('2d')!.putImageData(snapshot, 0, 0);
    c.drawImage(tmp, dx, dy);
  },
  onPointerUp(_point, ctx) {
    startPoint = null;
    snapshot = null;
    ctx.commit();
  },
};
