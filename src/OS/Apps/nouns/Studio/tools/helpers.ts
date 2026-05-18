/**
 * Drawing primitives shared by tools. Pure functions over a 2d context.
 *
 * Inspired by Noundry Studio's utils/canvas + tools/shapes.ts (CC0).
 */

import type { Point } from '../types';
import { CANVAS_SIZE } from '../types';

/** Paint a single pixel of `size`×`size` at canvas coords (x, y). */
export function paintPixel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  ctx.fillRect(x - size + 1, y - size + 1, size, size);
}

/** Clear a single pixel of `size`×`size`. */
export function erasePixel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  ctx.clearRect(x - size + 1, y - size + 1, size, size);
}

/**
 * Bresenham line — paints `size`×`size` cells along the line from a to b.
 * Inclusive of both endpoints.
 */
export function drawLine(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  size: number,
): void {
  let { x: x0, y: y0 } = a;
  const { x: x1, y: y1 } = b;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  // Cap iterations to prevent pathological infinite loops on bad inputs.
  for (let i = 0; i < 5000; i++) {
    paintPixel(ctx, x0, y0, size);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

/** Like drawLine but erases instead of paints. */
export function eraseLine(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  size: number,
): void {
  let { x: x0, y: y0 } = a;
  const { x: x1, y: y1 } = b;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let i = 0; i < 5000; i++) {
    erasePixel(ctx, x0, y0, size);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

/** Rectangle outline using Bresenham edges. */
export function drawRectOutline(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  size: number,
): void {
  const x0 = Math.min(a.x, b.x);
  const x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const y1 = Math.max(a.y, b.y);
  drawLine(ctx, { x: x0, y: y0 }, { x: x1, y: y0 }, size);
  drawLine(ctx, { x: x1, y: y0 }, { x: x1, y: y1 }, size);
  drawLine(ctx, { x: x1, y: y1 }, { x: x0, y: y1 }, size);
  drawLine(ctx, { x: x0, y: y1 }, { x: x0, y: y0 }, size);
}

/** Filled rectangle. */
export function drawRectFilled(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
): void {
  const x0 = Math.min(a.x, b.x);
  const x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const y1 = Math.max(a.y, b.y);
  ctx.fillRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
}

/**
 * Midpoint ellipse outline algorithm (1px stroke). `a` and `b` define
 * opposite corners of the bounding box.
 */
export function drawEllipseOutline(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
): void {
  const x0 = Math.min(a.x, b.x);
  const x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const y1 = Math.max(a.y, b.y);
  const w = x1 - x0;
  const h = y1 - y0;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const rx = w / 2;
  const ry = h / 2;
  if (rx <= 0 && ry <= 0) {
    ctx.fillRect(x0, y0, 1, 1);
    return;
  }
  const points = new Set<string>();
  // Sample densely; integer rounding deduplicates.
  const samples = Math.max(64, Math.ceil(2 * Math.PI * Math.max(rx, ry)));
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * 2 * Math.PI;
    const px = Math.round(cx + rx * Math.cos(t));
    const py = Math.round(cy + ry * Math.sin(t));
    points.add(`${px},${py}`);
  }
  for (const key of points) {
    const [px, py] = key.split(',').map(Number);
    ctx.fillRect(px, py, 1, 1);
  }
}

/**
 * Filled ellipse — scanline approach. Fills every pixel inside the ellipse
 * defined by the bounding box.
 */
export function drawEllipseFilled(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
): void {
  const x0 = Math.min(a.x, b.x);
  const x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const y1 = Math.max(a.y, b.y);
  const w = x1 - x0;
  const h = y1 - y0;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const rx = w / 2;
  const ry = h / 2;
  if (rx <= 0 || ry <= 0) {
    ctx.fillRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    return;
  }
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const nx = (px + 0.5 - cx) / rx;
      const ny = (py + 0.5 - cy) / ry;
      if (nx * nx + ny * ny <= 1) ctx.fillRect(px, py, 1, 1);
    }
  }
}

/**
 * Iterative 4-direction flood fill. Stack-safe (no recursion). Returns the
 * number of pixels painted.
 *
 * Inspired by Noundry Studio's Bucket.ts (CC0) but reimplemented as
 * iterative + raw RGBA comparison (no `colord` dep).
 */
export function floodFill(
  ctx: CanvasRenderingContext2D,
  start: Point,
  fillR: number,
  fillG: number,
  fillB: number,
  fillA: number,
): number {
  if (!inCanvas(start)) return 0;
  const img = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  const data = img.data;
  const idx = (x: number, y: number) => (y * CANVAS_SIZE + x) * 4;

  const i0 = idx(start.x, start.y);
  const tR = data[i0];
  const tG = data[i0 + 1];
  const tB = data[i0 + 2];
  const tA = data[i0 + 3];
  if (tR === fillR && tG === fillG && tB === fillB && tA === fillA) return 0;

  let painted = 0;
  const stack: Point[] = [start];
  while (stack.length) {
    const p = stack.pop()!;
    if (p.x < 0 || p.x >= CANVAS_SIZE || p.y < 0 || p.y >= CANVAS_SIZE) continue;
    const i = idx(p.x, p.y);
    if (
      data[i] !== tR ||
      data[i + 1] !== tG ||
      data[i + 2] !== tB ||
      data[i + 3] !== tA
    )
      continue;
    data[i] = fillR;
    data[i + 1] = fillG;
    data[i + 2] = fillB;
    data[i + 3] = fillA;
    painted++;
    stack.push(
      { x: p.x + 1, y: p.y },
      { x: p.x - 1, y: p.y },
      { x: p.x, y: p.y + 1 },
      { x: p.x, y: p.y - 1 },
    );
  }
  ctx.putImageData(img, 0, 0);
  return painted;
}

/** Whether a point is within the canvas bounds. */
export function inCanvas(p: Point): boolean {
  return p.x >= 0 && p.x < CANVAS_SIZE && p.y >= 0 && p.y < CANVAS_SIZE;
}

/**
 * Sample a single pixel's color from any canvas. Returns `null` for fully
 * transparent pixels (eyedropper should skip).
 */
export function sampleColor(
  ctx: CanvasRenderingContext2D,
  p: Point,
): string | null {
  if (!inCanvas(p)) return null;
  const data = ctx.getImageData(p.x, p.y, 1, 1).data;
  const [r, g, b, a] = [data[0], data[1], data[2], data[3]];
  if (a === 0) return null;
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** Parse `#rrggbb` or `#rrggbbaa` into RGBA components. */
export function parseHex(color: string): {
  r: number;
  g: number;
  b: number;
  a: number;
} {
  const c = color.startsWith('#') ? color.slice(1) : color;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const a = c.length >= 8 ? parseInt(c.slice(6, 8), 16) : 255;
  return { r, g, b, a };
}
