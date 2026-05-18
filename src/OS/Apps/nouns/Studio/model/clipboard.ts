/**
 * Selection + clipboard state. A selection is an axis-aligned rect; the
 * clipboard holds the ImageData of the last copied region.
 */

'use client';

import { create } from 'zustand';
import type { Rect } from '../types';

interface ClipboardState {
  /** Current selection rect, in canvas coords. Null when nothing selected. */
  selection: Rect | null;
  setSelection: (rect: Rect | null) => void;
  /** Clipboard contents from the most recent copy. */
  clipboard: ImageData | null;
  setClipboard: (data: ImageData | null) => void;
}

export const useClipboard = create<ClipboardState>()((set) => ({
  selection: null,
  setSelection: (selection) => set({ selection }),
  clipboard: null,
  setClipboard: (clipboard) => set({ clipboard }),
}));
