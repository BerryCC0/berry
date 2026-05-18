/**
 * Workspace state — project metadata, active layer, zoom/pan/grid toggles.
 * Anything that's about the editor's overall view + selection, not the
 * pixels themselves.
 */

'use client';

import { create } from 'zustand';
import { NOUN_PARTS, type NounPart, type StudioMode } from '../types';

export interface WorkspaceState {
  /** Current project ID (uuid) if saved, null if unsaved. */
  projectId: string | null;
  /** Trait ID if editing a standalone trait (mode === 'trait'). */
  traitId: string | null;
  /** Display name in the title bar. */
  name: string;
  setName: (name: string) => void;
  /** Whether the user is working on a full Noun (5 layers) or a single trait. */
  mode: StudioMode;
  setMode: (mode: StudioMode) => void;
  /** Which layer the tools draw on. */
  activePart: NounPart;
  setActivePart: (part: NounPart) => void;
  /** Zoom level (4×, 8×, 16×, 32×, 64×). */
  zoom: number;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  /** Pan offset in screen pixels. */
  pan: { x: number; y: number };
  setPan: (pan: { x: number; y: number }) => void;
  /** Show the 1px grid overlay. */
  gridOn: boolean;
  toggleGrid: () => void;
  /** Show only the active layer (hide others). */
  soloActiveLayer: boolean;
  toggleSoloActiveLayer: () => void;
  /** Mark whether there are unsaved changes. */
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
}

const ZOOM_LEVELS = [4, 8, 12, 16, 24, 32, 48, 64];

export const useWorkspace = create<WorkspaceState>()((set, get) => ({
  projectId: null,
  traitId: null,
  name: 'Untitled',
  setName: (name) => set({ name, dirty: true }),
  mode: 'project',
  setMode: (mode) => set({ mode }),
  activePart: NOUN_PARTS[3], // 'head' — most common starting point
  setActivePart: (activePart) => set({ activePart }),
  zoom: 16,
  setZoom: (zoom) => set({ zoom }),
  zoomIn: () => {
    const z = get().zoom;
    const next = ZOOM_LEVELS.find((l) => l > z) ?? ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
    set({ zoom: next });
  },
  zoomOut: () => {
    const z = get().zoom;
    const prev = [...ZOOM_LEVELS].reverse().find((l) => l < z) ?? ZOOM_LEVELS[0];
    set({ zoom: prev });
  },
  pan: { x: 0, y: 0 },
  setPan: (pan) => set({ pan }),
  gridOn: true,
  toggleGrid: () => set((state) => ({ gridOn: !state.gridOn })),
  soloActiveLayer: false,
  toggleSoloActiveLayer: () =>
    set((state) => ({ soloActiveLayer: !state.soloActiveLayer })),
  dirty: false,
  setDirty: (dirty) => set({ dirty }),
}));
