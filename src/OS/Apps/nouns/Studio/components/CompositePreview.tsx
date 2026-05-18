'use client';

/**
 * CompositePreview — renders the assembled Noun at small scales against
 * a handful of test backgrounds (checker / white / black / sample colors)
 * so the artist can see how the trait reads in different contexts.
 *
 * Pulls directly from the layer canvases via `useLayers`, redrawing on
 * any commit / undo / redo / visibility change.
 */

import { useEffect, useRef } from 'react';
import { useLayers } from '../model/layers';
import { CANVAS_SIZE, NOUN_PARTS } from '../types';
import styles from './CompositePreview.module.css';

const PREVIEW_SIZE = 64; // px — each preview tile

/** Composite the 5 layers (in z-order) onto `dst` at the given draw size. */
function compositeOnto(
  dst: CanvasRenderingContext2D,
  layers: ReturnType<typeof useLayers.getState>['layers'],
  size: number,
  background: string | null,
): void {
  dst.imageSmoothingEnabled = false;
  if (background === null) {
    drawChecker(dst, size);
  } else {
    dst.fillStyle = background;
    dst.fillRect(0, 0, size, size);
  }
  for (const part of NOUN_PARTS) {
    const state = layers[part];
    if (!state.canvas || !state.visible) continue;
    dst.drawImage(state.canvas, 0, 0, size, size);
  }
}

function drawChecker(ctx: CanvasRenderingContext2D, size: number): void {
  const cell = 4;
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      ctx.fillStyle = ((x / cell + y / cell) & 1) === 0 ? '#3a3a3a' : '#2e2e2e';
      ctx.fillRect(x, y, cell, cell);
    }
  }
}

interface PreviewTileProps {
  background: string | null;
  label: string;
}

function PreviewTile({ background, label }: PreviewTileProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const layers = useLayers((s) => s.layers);
  // Subscribe to history index of every layer so the preview repaints on edits.
  const fingerprint = NOUN_PARTS.map(
    (p) => `${layers[p].historyIndex}:${layers[p].visible}`,
  ).join('|');

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    compositeOnto(ctx, layers, PREVIEW_SIZE, background);
  }, [layers, background, fingerprint]);

  return (
    <div className={styles.tile}>
      <canvas
        ref={ref}
        width={PREVIEW_SIZE}
        height={PREVIEW_SIZE}
        className={styles.tileCanvas}
      />
      <span className={styles.tileLabel}>{label}</span>
    </div>
  );
}

export function CompositePreview() {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.heading}>Preview</span>
        <span className={styles.size}>
          {CANVAS_SIZE}×{CANVAS_SIZE}
        </span>
      </div>
      <div className={styles.grid}>
        <PreviewTile background={null} label="checker" />
        <PreviewTile background="#ffffff" label="white" />
        <PreviewTile background="#000000" label="black" />
        <PreviewTile background="#d5d7e1" label="cool" />
        <PreviewTile background="#e1d7d5" label="warm" />
        <PreviewTile background="#fe500c" label="orange" />
      </div>
    </div>
  );
}
