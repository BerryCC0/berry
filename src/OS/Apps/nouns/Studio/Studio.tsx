/**
 * Studio — pixel-art editor for 32×32 Nouns traits.
 *
 * Phase 1 complete: drawing canvas + 12 tools (brush, eraser, eyedropper,
 * bucket, line, rect, filled rect, ellipse, filled ellipse, move, selection),
 * per-layer undo/redo, grid + zoom + pan.
 *
 * Phase 2-6 build out: layers panel, palette panel, composite preview,
 * trait loading, persistence/galleries, submission flow.
 *
 * Inspired by Noundry Studio (CC0).
 */

'use client';

import type { AppComponentProps } from '@/OS/types/app';
import { PixelCanvas } from './components/PixelCanvas';
import { StatusBar } from './components/StatusBar';
import { ToolboxPanel } from './components/ToolboxPanel';
import { useStudioKeybindings } from './hooks/useStudioKeybindings';
import { useWorkspace } from './model/workspace';
import { NOUN_PARTS } from './types';
import styles from './Studio.module.css';

export function Studio({}: AppComponentProps) {
  useStudioKeybindings();
  const activePart = useWorkspace((s) => s.activePart);
  const setActivePart = useWorkspace((s) => s.setActivePart);
  const name = useWorkspace((s) => s.name);

  return (
    <div className={styles.studio}>
      {/* Header — placeholder until proper title bar lands in Phase 4 */}
      <div className={styles.header}>
        <span className={styles.title}>{name}</span>
        <span className={styles.partTabs}>
          {NOUN_PARTS.map((part) => (
            <button
              key={part}
              type="button"
              className={`${styles.partTab} ${activePart === part ? styles.activeTab : ''}`}
              onClick={() => setActivePart(part)}
            >
              {part}
            </button>
          ))}
        </span>
      </div>

      <div className={styles.body}>
        <ToolboxPanel />
        <PixelCanvas />
        {/* Right-side panels (Layers / Palette / CompositePreview) land in Phase 2 */}
      </div>

      <StatusBar />
    </div>
  );
}

export default Studio;
