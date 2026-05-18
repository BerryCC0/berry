'use client';

/**
 * LayersPanel — the right-side panel showing the 5 fixed Noun layers
 * (background → body → accessory → head → glasses) in z-order.
 *
 * Each row has:
 *  - a live thumbnail rendered from the layer's canvas
 *  - the part name
 *  - visibility toggle (eye icon)
 *  - lock toggle (padlock icon)
 *  - an "edited" dot if the layer has unsaved pixel changes
 *
 * Clicking a row selects it as the active layer (where the tools draw).
 */

import { useEffect, useRef } from 'react';
import { useLayers } from '../model/layers';
import { useWorkspace } from '../model/workspace';
import { CANVAS_SIZE, NOUN_PARTS, type NounPart } from '../types';
import styles from './LayersPanel.module.css';

const THUMB_SIZE = 40; // displayed thumbnail size in CSS px

function LayerThumb({ part }: { part: NounPart }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const layer = useLayers((s) => s.layers[part]);
  // Subscribe to history changes so the thumbnail re-renders after edits.
  const historyIndex = layer?.historyIndex ?? -1;

  useEffect(() => {
    const out = ref.current;
    if (!out || !layer?.canvas) return;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, THUMB_SIZE, THUMB_SIZE);
    // Checker beneath so transparency reads.
    const cell = 4;
    for (let y = 0; y < THUMB_SIZE; y += cell) {
      for (let x = 0; x < THUMB_SIZE; x += cell) {
        ctx.fillStyle = ((x / cell + y / cell) & 1) === 0 ? '#3a3a3a' : '#2e2e2e';
        ctx.fillRect(x, y, cell, cell);
      }
    }
    ctx.drawImage(layer.canvas, 0, 0, THUMB_SIZE, THUMB_SIZE);
  }, [layer, historyIndex]);

  return (
    <canvas
      ref={ref}
      width={THUMB_SIZE}
      height={THUMB_SIZE}
      className={styles.thumb}
    />
  );
}

export function LayersPanel() {
  const activePart = useWorkspace((s) => s.activePart);
  const setActivePart = useWorkspace((s) => s.setActivePart);
  const soloActiveLayer = useWorkspace((s) => s.soloActiveLayer);
  const toggleSolo = useWorkspace((s) => s.toggleSoloActiveLayer);
  const onionOpacity = useWorkspace((s) => s.onionOpacity);
  const setOnionOpacity = useWorkspace((s) => s.setOnionOpacity);
  const layers = useLayers((s) => s.layers);
  const toggleVisible = useLayers((s) => s.toggleVisible);
  const toggleLocked = useLayers((s) => s.toggleLocked);
  const clear = useLayers((s) => s.clear);

  // Show layers TOP-down (glasses first) so it reads like Photoshop.
  const ordered = [...NOUN_PARTS].reverse();

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.heading}>Layers</span>
        <button
          type="button"
          className={`${styles.miniButton} ${soloActiveLayer ? styles.miniActive : ''}`}
          onClick={toggleSolo}
          title="Solo active layer"
        >
          Solo
        </button>
      </div>
      <div className={styles.onionRow}>
        <span className={styles.onionLabel} title="Fade non-active layers">
          Onion
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(onionOpacity * 100)}
          onChange={(e) => setOnionOpacity(parseInt(e.target.value, 10) / 100)}
          className={styles.onionSlider}
        />
        <span className={styles.onionValue}>
          {onionOpacity === 0 ? 'off' : `${Math.round(onionOpacity * 100)}%`}
        </span>
      </div>
      <ul className={styles.list}>
        {ordered.map((part) => {
          const layer = layers[part];
          const isActive = part === activePart;
          return (
            <li
              key={part}
              className={`${styles.row} ${isActive ? styles.activeRow : ''}`}
              onClick={() => setActivePart(part)}
            >
              <LayerThumb part={part} />
              <div className={styles.meta}>
                <span className={styles.partName}>{part}</span>
                <span className={styles.partSub}>
                  {layer.edited ? 'edited' : ''}
                </span>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={`${styles.iconBtn} ${!layer.visible ? styles.iconOff : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVisible(part);
                  }}
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                  aria-label="toggle visibility"
                >
                  {layer.visible ? <EyeIcon /> : <EyeOffIcon />}
                </button>
                <button
                  type="button"
                  className={`${styles.iconBtn} ${layer.locked ? styles.iconOn : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLocked(part);
                  }}
                  title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                  aria-label="toggle lock"
                >
                  {layer.locked ? <LockIcon /> : <UnlockIcon />}
                </button>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Clear the ${part} layer?`)) clear(part);
                  }}
                  title="Clear layer"
                  aria-label="clear layer"
                >
                  <TrashIcon />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className={styles.footer}>
        {CANVAS_SIZE}×{CANVAS_SIZE} · {NOUN_PARTS.length} layers
      </div>
    </div>
  );
}

/* ---------- inline SVG icons (12px, pixel-aligned) ---------- */

function EyeIcon() {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true">
      <path
        d="M8 4c-3 0-5.5 2-7 4 1.5 2 4 4 7 4s5.5-2 7-4c-1.5-2-4-4-7-4zm0 6.5A2.5 2.5 0 1 1 8 5.5a2.5 2.5 0 0 1 0 5z"
        fill="currentColor"
      />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true">
      <path
        d="M2 2l12 12-1 1L11 13a8 8 0 0 1-3 .5C5 13.5 2.5 11.5 1 9.5c.7-1 1.6-1.9 2.7-2.6L1 4l1-2zm6 3c3 0 5.5 2 7 4-.4.5-.9 1.1-1.5 1.7L8.5 6.5c.5-.5 1-.5-.5-.5z"
        fill="currentColor"
      />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true">
      <path
        d="M5 7V5a3 3 0 0 1 6 0v2h1v7H4V7h1zm1 0h4V5a2 2 0 0 0-4 0v2z"
        fill="currentColor"
      />
    </svg>
  );
}
function UnlockIcon() {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true">
      <path
        d="M5 7V5a3 3 0 0 1 5.8-1l-1 .5A2 2 0 0 0 6 5v2h6v7H4V7h1z"
        fill="currentColor"
      />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true">
      <path
        d="M6 2h4l1 1h3v1H2V3h3l1-1zm-2 4h8l-1 8H5L4 6z"
        fill="currentColor"
      />
    </svg>
  );
}
