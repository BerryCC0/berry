'use client';

/**
 * ToolboxPanel — left-sidebar tool palette: brush size pips on top, a 2-col
 * tool grid in the middle, undo / redo for the active layer at the bottom.
 */

import { useBrush } from '../model/brush';
import { useLayers } from '../model/layers';
import { useToolbox } from '../model/toolbox';
import { useWorkspace } from '../model/workspace';
import { TOOL_ORDER, TOOLS } from '../tools';
import { ToolIcon } from './ToolIcon';
import styles from './ToolboxPanel.module.css';

const BRUSH_SIZES = [1, 2, 3, 4] as const;

export function ToolboxPanel() {
  const toolId = useToolbox((s) => s.toolId);
  const selectTool = useToolbox((s) => s.selectTool);
  const brushSize = useBrush((s) => s.brushSize);
  const setBrushSize = useBrush((s) => s.setBrushSize);
  const activePart = useWorkspace((s) => s.activePart);
  const undo = useLayers((s) => s.undo);
  const redo = useLayers((s) => s.redo);
  const layerState = useLayers((s) => s.layers[activePart]);
  const canUndo = (layerState?.historyIndex ?? 0) > 0;
  const canRedo =
    !!layerState && layerState.historyIndex < layerState.history.length - 1;

  return (
    <div className={styles.panel}>
      <div className={styles.sizePips} role="radiogroup" aria-label="Brush size">
        {BRUSH_SIZES.map((size) => {
          const active = brushSize === size;
          const dot = 4 + size * 2;
          return (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={active}
              className={`${styles.pip} ${active ? styles.pipActive : ''}`}
              onClick={() => setBrushSize(size)}
              title={`Brush size ${size}px`}
            >
              <span
                className={styles.pipDot}
                style={{ width: `${dot}px`, height: `${dot}px` }}
              />
            </button>
          );
        })}
      </div>

      <div className={styles.toolGrid}>
        {TOOL_ORDER.map((id) => {
          const t = TOOLS[id];
          const active = toolId === id;
          return (
            <button
              key={id}
              type="button"
              className={`${styles.toolButton} ${active ? styles.active : ''}`}
              title={`${t.name} (${t.shortcut})`}
              onClick={() => selectTool(id)}
            >
              <ToolIcon id={id} />
            </button>
          );
        })}
      </div>

      <div className={styles.historyRow}>
        <button
          type="button"
          className={styles.historyBtn}
          onClick={() => undo(activePart)}
          disabled={!canUndo}
          title="Undo (Cmd+Z)"
          aria-label="Undo"
        >
          <UndoIcon />
        </button>
        <button
          type="button"
          className={styles.historyBtn}
          onClick={() => redo(activePart)}
          disabled={!canRedo}
          title="Redo (Cmd+Shift+Z)"
          aria-label="Redo"
        >
          <RedoIcon />
        </button>
      </div>
    </div>
  );
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true">
      <path
        d="M6 4L2 8l4 4v-3h4a3 3 0 0 1 0 6H7v1h3a4 4 0 0 0 0-8H6V4z"
        fill="currentColor"
      />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true">
      <path
        d="M10 4l4 4-4 4v-3H6a3 3 0 0 0 0 6h3v1H6a4 4 0 0 1 0-8h4V4z"
        fill="currentColor"
      />
    </svg>
  );
}
