/**
 * Palette state — the Descriptor's on-chain palette (loaded via
 * useDescriptorPalette in Phase 2) and a per-project custom palette
 * for sketching with colors that may not be on-chain yet.
 */

'use client';

import { create } from 'zustand';
import type { Color } from '../types';

interface PaletteState {
  /** Loaded from Descriptor.palettes(0). All on-chain trait pixels must
   *  ultimately resolve to these colors. */
  descriptor: Color[];
  setDescriptor: (palette: Color[]) => void;
  /** Per-project working palette. Stored alongside the project. */
  custom: Color[];
  addCustom: (color: Color) => void;
  removeCustom: (color: Color) => void;
  setCustom: (palette: Color[]) => void;
  clearCustom: () => void;
}

export const usePalette = create<PaletteState>()((set) => ({
  descriptor: [],
  setDescriptor: (descriptor) => set({ descriptor }),
  custom: [],
  addCustom: (color) =>
    set((s) =>
      s.custom.includes(color) ? s : { custom: [...s.custom, color] },
    ),
  removeCustom: (color) =>
    set((s) => ({ custom: s.custom.filter((c) => c !== color) })),
  setCustom: (custom) => set({ custom }),
  clearCustom: () => set({ custom: [] }),
}));
