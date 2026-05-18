/**
 * Eraser tool — clears pixels along the dragged path (to transparent).
 * Algorithmic structure inspired by Noundry Studio (CC0).
 */

import { useBrush } from '../model/brush';
import type { Point, Tool } from '../types';
import { eraseLine, erasePixel } from './helpers';

let lastPoint: Point | null = null;

export const eraserTool: Tool = {
  id: 'eraser',
  name: 'Eraser',
  shortcut: 'E',
  onPointerDown(point, ctx) {
    const { brushSize } = useBrush.getState();
    erasePixel(ctx.canvas.getContext('2d')!, point.x, point.y, brushSize);
    lastPoint = point;
  },
  onPointerMove(point, ctx) {
    if (!lastPoint) return;
    const { brushSize } = useBrush.getState();
    eraseLine(ctx.canvas.getContext('2d')!, lastPoint, point, brushSize);
    lastPoint = point;
  },
  onPointerUp(_point, ctx) {
    lastPoint = null;
    ctx.commit();
  },
};
