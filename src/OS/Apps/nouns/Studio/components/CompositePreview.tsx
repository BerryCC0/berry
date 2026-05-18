'use client';

/**
 * CompositePreview — large assembled-Noun preview that sits at the top of the
 * right column. Shows the live z-stacked render of all 5 layers and offers
 * quick actions (export PNG, copy to clipboard, cycle background).
 *
 * The composite paints into a 32×32 offscreen canvas, then the displayed
 * canvas scales it up with `image-rendering: pixelated`. That keeps the math
 * simple (1 pixel = 1 trait pixel) and the on-screen render crisp.
 */

import { useEffect, useRef, useState } from 'react';
import { useLayers } from '../model/layers';
import { useWorkspace } from '../model/workspace';
import { CANVAS_SIZE, NOUN_PARTS } from '../types';
import { composeThumbnail } from '../utils/composeThumbnail';
import { downloadDataUrl, slugify } from '../utils/downloadDataUrl';
import styles from './CompositePreview.module.css';

const BACKGROUNDS: Array<{ id: string; label: string; value: string | null }> = [
  { id: 'checker', label: 'Checker', value: null },
  { id: 'cool', label: 'Cool', value: '#d5d7e1' },
  { id: 'warm', label: 'Warm', value: '#e1d7d5' },
  { id: 'white', label: 'White', value: '#ffffff' },
  { id: 'black', label: 'Black', value: '#000000' },
];

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
  // 2-pixel checker so it reads inside a 32×32 cell when nothing is drawn.
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      ctx.fillStyle = ((x / 2 + y / 2) & 1) === 0 ? '#3a3a3a' : '#2e2e2e';
      ctx.fillRect(x, y, 2, 2);
    }
  }
}

export function CompositePreview() {
  const ref = useRef<HTMLCanvasElement>(null);
  const layers = useLayers((s) => s.layers);
  const getCanvases = useLayers((s) => s.getCanvases);
  const name = useWorkspace((s) => s.name);

  const [bgIndex, setBgIndex] = useState(0);
  const background = BACKGROUNDS[bgIndex];

  // Repaint when any layer's pixels or visibility change.
  const fingerprint = NOUN_PARTS.map(
    (p) => `${layers[p].historyIndex}:${layers[p].visible}`,
  ).join('|');

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    compositeOnto(ctx, layers, CANVAS_SIZE, background.value);
  }, [layers, background, fingerprint]);

  function handleExport(): void {
    const dataUrl = composeThumbnail(getCanvases(), {
      size: 512,
      background: background.value,
    });
    if (!dataUrl) return;
    downloadDataUrl(dataUrl, `${slugify(name)}-512.png`);
  }

  async function handleCopy(): Promise<void> {
    const dataUrl = composeThumbnail(getCanvases(), {
      size: 512,
      background: background.value,
    });
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      // ClipboardItem is the modern way to write images; falls back silently.
      if (typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
      }
    } catch {
      // Best-effort — some browsers / contexts block image clipboard.
    }
  }

  function cycleBackground(): void {
    setBgIndex((i) => (i + 1) % BACKGROUNDS.length);
  }

  return (
    <div className={styles.panel}>
      <div className={styles.previewWrap}>
        <canvas
          ref={ref}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className={styles.previewCanvas}
        />
      </div>
      <div className={styles.meta}>
        <span className={styles.metaLabel}>{background.label}</span>
        <span className={styles.metaSize}>
          {CANVAS_SIZE}×{CANVAS_SIZE}
        </span>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={cycleBackground}
          title="Cycle preview background"
          aria-label="Cycle background"
        >
          <BgIcon />
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={handleCopy}
          title="Copy PNG to clipboard"
          aria-label="Copy PNG"
        >
          <CopyIcon />
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={handleExport}
          title="Export 512×512 PNG"
          aria-label="Export PNG"
        >
          <DownloadIcon />
        </button>
      </div>
    </div>
  );
}

function BgIcon() {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true">
      <path
        d="M2 2h12v12H2V2zm2 2v8h8V4H4z"
        fill="currentColor"
      />
      <path d="M5 5h3v3H5zM8 8h3v3H8z" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true">
      <path
        d="M4 1h7v2H4v9H2V1zm3 3h7v11H7V4zm1 1v9h5V5H8z"
        fill="currentColor"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true">
      <path
        d="M7 1h2v6h3l-4 5-4-5h3V1zM2 13h12v2H2v-2z"
        fill="currentColor"
      />
    </svg>
  );
}
