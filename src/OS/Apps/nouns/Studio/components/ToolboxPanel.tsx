'use client';

/**
 * ToolboxPanel — vertical strip of tool icons on the left side of the editor.
 */

import { useToolbox } from '../model/toolbox';
import { TOOL_ORDER, TOOLS } from '../tools';
import { ToolIcon } from './ToolIcon';
import styles from './ToolboxPanel.module.css';

export function ToolboxPanel() {
  const toolId = useToolbox((s) => s.toolId);
  const selectTool = useToolbox((s) => s.selectTool);

  return (
    <div className={styles.panel}>
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
  );
}
