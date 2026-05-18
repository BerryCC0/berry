/**
 * Brush tool — paints with the current color along the dragged path.
 * Algorithmic structure inspired by Noundry Studio (CC0).
 */

import { useBrush } from '../model/brush';
import type { Point, Tool, ToolContext } from '../types';
import { brushFootprintPreview, drawLine, paintPixel } from './helpers';

let lastPoint: Point | null = null;

export const brushTool: Tool = {
  id: 'brush',
  name: 'Brush',
  shortcut: 'B',
  onPointerDown(point, ctx) {
    const { color, brushSize } = useBrush.getState();
    const c = ctx.canvas.getContext('2d')!;
    c.fillStyle = color;
    paintPixel(c, point.x, point.y, brushSize);
    lastPoint = point;
  },
  onPointerMove(point, ctx) {
    if (!lastPoint) return;
    const { color, brushSize } = useBrush.getState();
    const c = ctx.canvas.getContext('2d')!;
    c.fillStyle = color;
    drawLine(c, lastPoint, point, brushSize);
    lastPoint = point;
  },
  onPointerUp(_point, ctx: ToolContext) {
    lastPoint = null;
    ctx.commit();
  },
  hoverPreview(point, overlayCtx) {
    const { color, brushSize } = useBrush.getState();
    brushFootprintPreview(overlayCtx, point, brushSize, color);
  },
};
