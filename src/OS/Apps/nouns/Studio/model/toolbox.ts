/**
 * Toolbox state — which tool is active and which was previously active.
 *
 * `previousTool` is used by the eyedropper to switch back to the tool the
 * user was using before sampling a color.
 *
 * Inspired by Noundry Studio's ToolboxState (CC0).
 */

'use client';

import { create } from 'zustand';
import type { ToolId } from '../types';

interface ToolboxState {
  toolId: ToolId;
  previousToolId: ToolId;
  selectTool: (toolId: ToolId) => void;
}

export const useToolbox = create<ToolboxState>()((set) => ({
  toolId: 'brush',
  previousToolId: 'brush',
  selectTool: (toolId) =>
    set((s) =>
      s.toolId === toolId ? s : { toolId, previousToolId: s.toolId },
    ),
}));
