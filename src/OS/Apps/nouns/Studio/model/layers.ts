/**
 * Layers store — 5 fixed slots (background / body / accessory / head / glasses)
 * with per-layer history for undo / redo.
 *
 * Each layer's pixel data lives on its own 32×32 HTMLCanvasElement. The canvas
 * is the source of truth; ImageData snapshots in history allow undo.
 *
 * Inspired by Noundry Studio's NounPart / Noun model (CC0).
 */

'use client';

import { create } from 'zustand';
import { CANVAS_SIZE, NOUN_PARTS, type LayerState, type NounPart } from '../types';

interface LayersState {
  /** Per-part state, always all 5 slots present. */
  layers: Record<NounPart, LayerState>;

  /** Commit the active layer's current canvas pixels to its history. */
  commit: (part: NounPart) => void;
  /** Undo on a specific layer. */
  undo: (part: NounPart) => void;
  /** Redo on a specific layer. */
  redo: (part: NounPart) => void;
  /** Clear a layer (transparent). Commits to history. */
  clear: (part: NounPart) => void;
  /** Replace a layer's canvas contents with provided ImageData. Commits. */
  loadImageData: (part: NounPart, imageData: ImageData) => void;
  /** Toggle layer visibility. */
  toggleVisible: (part: NounPart) => void;
  /** Toggle layer lock. */
  toggleLocked: (part: NounPart) => void;
  /** Reset all layers to empty (for "new blank project"). */
  resetAll: () => void;
  /** Get all layer canvases as a flat record (for tool context). */
  getCanvases: () => Record<NounPart, HTMLCanvasElement>;
}

function makeLayerCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = CANVAS_SIZE;
  c.height = CANVAS_SIZE;
  // willReadFrequently hints the browser to keep pixel data CPU-readable —
  // critical for fast bucket fill / eyedropper / history snapshots.
  c.getContext('2d', { willReadFrequently: true });
  return c;
}

function snapshot(canvas: HTMLCanvasElement): ImageData {
  return canvas
    .getContext('2d', { willReadFrequently: true })!
    .getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
}

function restore(canvas: HTMLCanvasElement, data: ImageData): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.putImageData(data, 0, 0);
}

function clearCanvas(canvas: HTMLCanvasElement): void {
  canvas.getContext('2d')!.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
}

function imageDataEquals(a: ImageData, b: ImageData): boolean {
  if (a.width !== b.width || a.height !== b.height) return false;
  const ad = a.data;
  const bd = b.data;
  if (ad.length !== bd.length) return false;
  for (let i = 0; i < ad.length; i++) if (ad[i] !== bd[i]) return false;
  return true;
}

function makeInitialLayer(part: NounPart): LayerState {
  // SSR-safe guard: canvas creation requires the DOM.
  if (typeof document === 'undefined') {
    return {
      part,
      canvas: null as unknown as HTMLCanvasElement,
      history: [],
      historyIndex: -1,
      visible: true,
      locked: false,
      edited: false,
    };
  }
  const canvas = makeLayerCanvas();
  const initial = snapshot(canvas);
  return {
    part,
    canvas,
    history: [initial],
    historyIndex: 0,
    visible: true,
    locked: false,
    edited: false,
  };
}

function makeInitialLayers(): Record<NounPart, LayerState> {
  const out = {} as Record<NounPart, LayerState>;
  for (const part of NOUN_PARTS) out[part] = makeInitialLayer(part);
  return out;
}

export const useLayers = create<LayersState>()((set, get) => ({
  layers: makeInitialLayers(),

  commit: (part) => {
    const state = get().layers[part];
    if (!state.canvas) return;
    const current = snapshot(state.canvas);
    const prev = state.history[state.historyIndex];
    if (prev && imageDataEquals(prev, current)) return; // no-op
    // Drop forward history when committing after an undo.
    const trimmed = state.history.slice(0, state.historyIndex + 1);
    const newHistory = [...trimmed, current];
    set((s) => ({
      layers: {
        ...s.layers,
        [part]: {
          ...s.layers[part],
          history: newHistory,
          historyIndex: newHistory.length - 1,
          edited: true,
        },
      },
    }));
  },

  undo: (part) => {
    const state = get().layers[part];
    if (state.historyIndex <= 0) return;
    const nextIndex = state.historyIndex - 1;
    restore(state.canvas, state.history[nextIndex]);
    set((s) => ({
      layers: {
        ...s.layers,
        [part]: { ...s.layers[part], historyIndex: nextIndex },
      },
    }));
  },

  redo: (part) => {
    const state = get().layers[part];
    if (state.historyIndex >= state.history.length - 1) return;
    const nextIndex = state.historyIndex + 1;
    restore(state.canvas, state.history[nextIndex]);
    set((s) => ({
      layers: {
        ...s.layers,
        [part]: { ...s.layers[part], historyIndex: nextIndex },
      },
    }));
  },

  clear: (part) => {
    const state = get().layers[part];
    if (!state.canvas) return;
    clearCanvas(state.canvas);
    get().commit(part);
  },

  loadImageData: (part, imageData) => {
    const state = get().layers[part];
    if (!state.canvas) return;
    restore(state.canvas, imageData);
    get().commit(part);
  },

  toggleVisible: (part) =>
    set((s) => ({
      layers: {
        ...s.layers,
        [part]: { ...s.layers[part], visible: !s.layers[part].visible },
      },
    })),

  toggleLocked: (part) =>
    set((s) => ({
      layers: {
        ...s.layers,
        [part]: { ...s.layers[part], locked: !s.layers[part].locked },
      },
    })),

  resetAll: () => set({ layers: makeInitialLayers() }),

  getCanvases: () => {
    const out = {} as Record<NounPart, HTMLCanvasElement>;
    const ls = get().layers;
    for (const part of NOUN_PARTS) out[part] = ls[part].canvas;
    return out;
  },
}));
