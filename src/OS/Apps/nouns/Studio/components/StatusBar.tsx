'use client';

/**
 * StatusBar — tool name, zoom level, active layer, dirty indicator.
 * Sits at the bottom of the Studio window.
 */

import { useLayers } from '../model/layers';
import { useToolbox } from '../model/toolbox';
import { useWorkspace } from '../model/workspace';
import { TOOLS } from '../tools';
import styles from './StatusBar.module.css';

export function StatusBar() {
  const toolId = useToolbox((s) => s.toolId);
  const zoom = useWorkspace((s) => s.zoom);
  const activePart = useWorkspace((s) => s.activePart);
  const zoomIn = useWorkspace((s) => s.zoomIn);
  const zoomOut = useWorkspace((s) => s.zoomOut);
  const gridOn = useWorkspace((s) => s.gridOn);
  const toggleGrid = useWorkspace((s) => s.toggleGrid);
  const dirty = useWorkspace((s) => s.dirty);
  const undo = useLayers((s) => s.undo);
  const redo = useLayers((s) => s.redo);
  const layerState = useLayers((s) => s.layers[activePart]);
  const canUndo = layerState?.historyIndex > 0;
  const canRedo =
    layerState && layerState.historyIndex < layerState.history.length - 1;

  return (
    <div className={styles.bar}>
      <span className={styles.cell}>{TOOLS[toolId].name}</span>
      <span className={styles.sep}>·</span>
      <span className={styles.cell}>{activePart}</span>
      <span className={styles.sep}>·</span>
      <button
        type="button"
        className={styles.button}
        onClick={() => undo(activePart)}
        disabled={!canUndo}
      >
        ↶ Undo
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={() => redo(activePart)}
        disabled={!canRedo}
      >
        ↷ Redo
      </button>
      <span className={styles.spacer} />
      <button
        type="button"
        className={`${styles.button} ${gridOn ? styles.active : ''}`}
        onClick={toggleGrid}
        title="Toggle grid (Cmd+G)"
      >
        Grid
      </button>
      <span className={styles.sep}>·</span>
      <button type="button" className={styles.button} onClick={zoomOut} title="Zoom out (Cmd+-)">
        −
      </button>
      <span className={styles.cellMono}>{zoom}×</span>
      <button type="button" className={styles.button} onClick={zoomIn} title="Zoom in (Cmd+=)">
        +
      </button>
      {dirty && <span className={styles.dirty}>● unsaved</span>}
    </div>
  );
}
