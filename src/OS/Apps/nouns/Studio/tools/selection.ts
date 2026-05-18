/**
 * Selection tool — drag-rectangle marquee.
 *
 * Updates the clipboard store's `selection` rect. Doesn't draw to the canvas —
 * the canvas component renders the selection overlay on a separate layer.
 *
 * Operations on a selection (copy/paste/delete) are handled by keybindings
 * via `useStudioKeybindings`, not by this tool's pointer events.
 */

import { useClipboard } from '../model/clipboard';
import type { Point, Rect, Tool } from '../types';

let start: Point | null = null;

function rectFrom(a: Point, b: Point): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const width = Math.abs(b.x - a.x) + 1;
  const height = Math.abs(b.y - a.y) + 1;
  return { x, y, width, height };
}

export const selectionTool: Tool = {
  id: 'selection',
  name: 'Select',
  shortcut: 'M',
  onPointerDown(point) {
    start = point;
    useClipboard.getState().setSelection({ x: point.x, y: point.y, width: 1, height: 1 });
  },
  onPointerMove(point) {
    if (!start) return;
    useClipboard.getState().setSelection(rectFrom(start, point));
  },
  onPointerUp() {
    start = null;
    // Selection persists; user can hit Esc to clear, or click again to reset.
  },
};
