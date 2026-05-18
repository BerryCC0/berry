'use client';

/**
 * Global keyboard shortcuts for Studio.
 *
 * Tool letters (b/e/i/g/l/r/o/v/m), undo/redo (Cmd+Z / Cmd+Shift+Z),
 * zoom (Cmd+=/-/0), grid (Cmd+G), escape (clear selection).
 */

import { useEffect } from 'react';
import { useClipboard } from '../model/clipboard';
import { useLayers } from '../model/layers';
import { useToolbox } from '../model/toolbox';
import { useWorkspace } from '../model/workspace';
import { SHORTCUT_MAP } from '../tools';

export function useStudioKeybindings() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Don't intercept when the user is typing in an input.
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const cmd = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      const key = e.key.toLowerCase();

      // Undo / Redo
      if (cmd && key === 'z') {
        e.preventDefault();
        const part = useWorkspace.getState().activePart;
        if (shift) useLayers.getState().redo(part);
        else useLayers.getState().undo(part);
        return;
      }

      // Zoom
      if (cmd && (key === '=' || key === '+')) {
        e.preventDefault();
        useWorkspace.getState().zoomIn();
        return;
      }
      if (cmd && key === '-') {
        e.preventDefault();
        useWorkspace.getState().zoomOut();
        return;
      }
      if (cmd && key === '0') {
        e.preventDefault();
        useWorkspace.getState().setZoom(16);
        return;
      }

      // Grid toggle
      if (cmd && key === 'g') {
        e.preventDefault();
        useWorkspace.getState().toggleGrid();
        return;
      }

      // Escape — clear selection
      if (key === 'escape') {
        useClipboard.getState().setSelection(null);
        return;
      }

      // Tool shortcuts (no modifier, or shift for variant tools)
      if (!cmd) {
        // Shift+R → filledRectangle, Shift+O → filledEllipse
        if (shift && key === 'r') {
          e.preventDefault();
          useToolbox.getState().selectTool('filledRectangle');
          return;
        }
        if (shift && key === 'o') {
          e.preventDefault();
          useToolbox.getState().selectTool('filledEllipse');
          return;
        }
        const toolId = SHORTCUT_MAP[key];
        if (toolId) {
          e.preventDefault();
          useToolbox.getState().selectTool(toolId);
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
