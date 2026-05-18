'use client';

/**
 * PixelCanvas — the main drawing surface.
 *
 * Renders all 5 layer canvases composited in z-order, plus:
 *   - a checker-board transparency pattern beneath
 *   - an optional 1px grid overlay
 *   - a hover/selection overlay that follows the cursor
 *
 * Pointer events are translated from screen → canvas coords using the current
 * zoom, then dispatched to the active tool. After each operation, the
 * compositor redraws.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLayers } from '../model/layers';
import { useToolbox } from '../model/toolbox';
import { useWorkspace } from '../model/workspace';
import { useClipboard } from '../model/clipboard';
import { TOOLS } from '../tools';
import {
  CANVAS_SIZE,
  NOUN_PARTS,
  type NounPart,
  type Point,
} from '../types';
import styles from './PixelCanvas.module.css';

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Convert screen coords (within the composite canvas element) → canvas pixel. */
function screenToCanvas(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  zoom: number,
): Point {
  return {
    x: clamp(Math.floor((clientX - rect.left) / zoom), 0, CANVAS_SIZE - 1),
    y: clamp(Math.floor((clientY - rect.top) / zoom), 0, CANVAS_SIZE - 1),
  };
}

export function PixelCanvas() {
  const compositeRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  const layers = useLayers((s) => s.layers);
  const commit = useLayers((s) => s.commit);
  const toolId = useToolbox((s) => s.toolId);
  const selectTool = useToolbox((s) => s.selectTool);
  const zoom = useWorkspace((s) => s.zoom);
  const pan = useWorkspace((s) => s.pan);
  const setPan = useWorkspace((s) => s.setPan);
  const gridOn = useWorkspace((s) => s.gridOn);
  const activePart = useWorkspace((s) => s.activePart);
  const soloActiveLayer = useWorkspace((s) => s.soloActiveLayer);
  const selection = useClipboard((s) => s.selection);

  const [drawing, setDrawing] = useState(false);
  const [hover, setHover] = useState<Point | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);

  const tool = TOOLS[toolId];
  const dim = CANVAS_SIZE * zoom;

  // Build the tool context. layers.getCanvases() is stable enough that this
  // closure can be recreated each render without thrashing.
  const getCanvases = useLayers((s) => s.getCanvases);
  const buildContext = useCallback(() => {
    const canvas = layers[activePart].canvas;
    return {
      canvas,
      layers: getCanvases(),
      activePart,
      selectTool: (id: typeof toolId) => selectTool(id),
      commit: () => commit(activePart),
    };
  }, [layers, activePart, getCanvases, selectTool, commit]);

  // Re-composite whenever any layer or relevant view setting changes.
  useEffect(() => {
    const composite = compositeRef.current;
    if (!composite) return;
    const ctx = composite.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, dim, dim);

    // Checker pattern beneath.
    drawCheckerboard(ctx, dim);

    // Each layer.
    for (const part of NOUN_PARTS) {
      const state = layers[part];
      if (!state.canvas) continue;
      if (soloActiveLayer && part !== activePart) continue;
      if (!state.visible) continue;
      ctx.drawImage(state.canvas, 0, 0, dim, dim);
    }

    // Grid overlay.
    if (gridOn) drawGrid(ctx, dim, zoom);
  }, [layers, activePart, soloActiveLayer, gridOn, dim, zoom]);

  // Render the overlay (hover preview + selection marquee).
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d')!;
    ctx.clearRect(0, 0, dim, dim);

    if (hover && !drawing && tool.hoverPreview) {
      ctx.save();
      ctx.scale(zoom, zoom);
      tool.hoverPreview(hover, ctx);
      ctx.restore();
    }

    if (selection) {
      ctx.save();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(
        selection.x * zoom + 0.5,
        selection.y * zoom + 0.5,
        selection.width * zoom - 1,
        selection.height * zoom - 1,
      );
      ctx.strokeStyle = '#000';
      ctx.setLineDash([4, 3]);
      ctx.lineDashOffset = 4;
      ctx.strokeRect(
        selection.x * zoom + 0.5,
        selection.y * zoom + 0.5,
        selection.width * zoom - 1,
        selection.height * zoom - 1,
      );
      ctx.restore();
    }
  }, [hover, drawing, selection, tool, zoom, dim]);

  // Track space for pan-by-drag.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space') setSpaceDown(true);
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') setSpaceDown(false);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (spaceDown || e.button === 1) {
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    if (e.button !== 0) return;
    if (layers[activePart].locked) return;
    const p = screenToCanvas(e.clientX, e.clientY, rect, zoom);
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrawing(true);
    tool.onPointerDown(p, buildContext());
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (panStartRef.current) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }
    const p = screenToCanvas(e.clientX, e.clientY, rect, zoom);
    setHover(p);
    if (!drawing) return;
    tool.onPointerMove(p, buildContext());
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (panStartRef.current) {
      panStartRef.current = null;
      return;
    }
    if (!drawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const p = screenToCanvas(e.clientX, e.clientY, rect, zoom);
    tool.onPointerUp(p, buildContext());
    setDrawing(false);
  };

  const handlePointerLeave = () => {
    setHover(null);
  };

  const cursor = panStartRef.current
    ? 'grabbing'
    : spaceDown
      ? 'grab'
      : 'crosshair';

  return (
    <div
      className={styles.viewport}
      style={{
        cursor,
      }}
    >
      <div
        className={styles.canvasStack}
        style={{
          width: dim,
          height: dim,
          transform: `translate(${pan.x}px, ${pan.y}px)`,
        }}
      >
        <canvas
          ref={compositeRef}
          width={dim}
          height={dim}
          className={styles.composite}
        />
        <canvas
          ref={overlayRef}
          width={dim}
          height={dim}
          className={styles.overlay}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
    </div>
  );
}

function drawCheckerboard(ctx: CanvasRenderingContext2D, size: number): void {
  const cell = 8;
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      ctx.fillStyle = ((x / cell + y / cell) & 1) === 0 ? '#404040' : '#3a3a3a';
      ctx.fillRect(x, y, cell, cell);
    }
  }
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  size: number,
  zoom: number,
): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= CANVAS_SIZE; i++) {
    const x = i * zoom + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    const y = i * zoom + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
  }
  ctx.stroke();
  // Heavier mid-line at 16 (every 8 pixels) for orientation.
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  for (let i = 0; i <= CANVAS_SIZE; i += 8) {
    const x = i * zoom + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    const y = i * zoom + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
  }
  ctx.stroke();
  ctx.restore();
}
