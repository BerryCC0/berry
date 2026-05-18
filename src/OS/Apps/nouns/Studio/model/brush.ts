/**
 * Brush state — current paint color, previous color (for eyedropper revert),
 * and brush size.
 *
 * Inspired by Noundry Studio's BrushState (CC0).
 */

'use client';

import { create } from 'zustand';
import type { Color } from '../types';

export interface BrushState {
  color: Color;
  setColor: (color: Color) => void;
  previousColor: Color;
  setPreviousColor: (color: Color) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
}

export const useBrush = create<BrushState>()((set) => ({
  color: '#000000',
  setColor: (color) => set({ color }),
  previousColor: '#000000',
  setPreviousColor: (previousColor) => set({ previousColor }),
  brushSize: 1,
  setBrushSize: (brushSize) => set({ brushSize }),
}));
