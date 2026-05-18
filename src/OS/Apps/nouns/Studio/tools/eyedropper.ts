/**
 * Eyedropper tool — samples color from the topmost visible layer at the
 * clicked point, sets the brush color, and reverts to the previously-active
 * tool.
 *
 * Algorithmic structure inspired by Noundry Studio (CC0).
 */

import { useBrush } from '../model/brush';
import { useToolbox } from '../model/toolbox';
import { NOUN_PARTS, type Tool } from '../types';
import { sampleColor, singlePixelPreview } from './helpers';

export const eyedropperTool: Tool = {
  id: 'eyedropper',
  name: 'Eyedropper',
  shortcut: 'I',
  onPointerDown(point, ctx) {
    // Walk top-down (glasses → background) and take the first non-transparent hit.
    for (let i = NOUN_PARTS.length - 1; i >= 0; i--) {
      const canvas = ctx.layers[NOUN_PARTS[i]];
      if (!canvas) continue;
      const c = canvas.getContext('2d', { willReadFrequently: true })!;
      const color = sampleColor(c, point);
      if (color) {
        const { setColor, setPreviousColor } = useBrush.getState();
        setColor(color);
        setPreviousColor(color);
        // Revert to the previous tool (typically brush).
        const { previousToolId } = useToolbox.getState();
        ctx.selectTool(previousToolId);
        return;
      }
    }
  },
  onPointerMove() {
    // no-op — eyedropper is a one-shot click
  },
  onPointerUp() {
    // no-op
  },
  hoverPreview(point, overlayCtx) {
    singlePixelPreview(overlayCtx, point);
  },
};
