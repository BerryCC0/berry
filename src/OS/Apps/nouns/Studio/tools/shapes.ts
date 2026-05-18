/**
 * Shape tools — line, rectangle, filled rectangle, ellipse, filled ellipse.
 *
 * Each is implemented as a "preview-while-dragging" tool:
 *   - onPointerDown: snapshot the canvas, record start point
 *   - onPointerMove: restore snapshot, draw the preview from start → current
 *   - onPointerUp:   commit the final shape to history
 *
 * Algorithmic structure inspired by Noundry Studio's shape tools (CC0).
 */

import { useBrush } from '../model/brush';
import type { Point, Tool } from '../types';
import { CANVAS_SIZE } from '../types';
import {
  brushFootprintPreview,
  drawEllipseFilled,
  drawEllipseOutline,
  drawLine,
  drawRectFilled,
  drawRectOutline,
  singlePixelPreview,
} from './helpers';

interface ShapeDrawer {
  draw(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    brushSize: number,
  ): void;
}

function makeShapeTool(
  id: Tool['id'],
  name: string,
  shortcut: string,
  drawer: ShapeDrawer,
  options?: { usesBrushSize?: boolean },
): Tool {
  let startPoint: Point | null = null;
  let snapshot: ImageData | null = null;
  const usesBrushSize = options?.usesBrushSize ?? true;

  return {
    id,
    name,
    shortcut,
    onPointerDown(point, ctx) {
      const c = ctx.canvas.getContext('2d', { willReadFrequently: true })!;
      snapshot = c.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      startPoint = point;
      const { color, brushSize } = useBrush.getState();
      c.fillStyle = color;
      drawer.draw(c, point, point, brushSize);
    },
    onPointerMove(point, ctx) {
      if (!startPoint || !snapshot) return;
      const c = ctx.canvas.getContext('2d', { willReadFrequently: true })!;
      c.putImageData(snapshot, 0, 0);
      const { color, brushSize } = useBrush.getState();
      c.fillStyle = color;
      drawer.draw(c, startPoint, point, brushSize);
    },
    onPointerUp(_point, ctx) {
      startPoint = null;
      snapshot = null;
      ctx.commit();
    },
    hoverPreview(point, overlayCtx) {
      // Stroke-style shapes (line, rect outline) honor brush size; filled
      // shapes and ellipses ignore stroke width — show the cursor pixel only.
      if (usesBrushSize) {
        const { color, brushSize } = useBrush.getState();
        brushFootprintPreview(overlayCtx, point, brushSize, color);
      } else {
        singlePixelPreview(overlayCtx, point);
      }
    },
  };
}

export const lineTool: Tool = makeShapeTool('line', 'Line', 'L', {
  draw(ctx, start, end, brushSize) {
    drawLine(ctx, start, end, brushSize);
  },
});

export const rectangleTool: Tool = makeShapeTool('rectangle', 'Rectangle', 'R', {
  draw(ctx, start, end, brushSize) {
    drawRectOutline(ctx, start, end, brushSize);
  },
});

export const filledRectangleTool: Tool = makeShapeTool(
  'filledRectangle',
  'Filled Rectangle',
  'Shift+R',
  {
    draw(ctx, start, end) {
      drawRectFilled(ctx, start, end);
    },
  },
  { usesBrushSize: false },
);

export const ellipseTool: Tool = makeShapeTool(
  'ellipse',
  'Ellipse',
  'O',
  {
    draw(ctx, start, end) {
      drawEllipseOutline(ctx, start, end);
    },
  },
  { usesBrushSize: false },
);

export const filledEllipseTool: Tool = makeShapeTool(
  'filledEllipse',
  'Filled Ellipse',
  'Shift+O',
  {
    draw(ctx, start, end) {
      drawEllipseFilled(ctx, start, end);
    },
  },
  { usesBrushSize: false },
);
