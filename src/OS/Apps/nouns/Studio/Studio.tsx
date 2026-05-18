/**
 * Studio — pixel-art editor for 32×32 Nouns traits.
 *
 * Phase 1 complete: drawing canvas + 12 tools (brush, eraser, eyedropper,
 * bucket, line, rect, filled rect, ellipse, filled ellipse, move, selection),
 * per-layer undo/redo, grid + zoom + pan.
 *
 * Phase 2+ adds: layers panel, palette panel, composite preview, trait
 * loading + fork dialogs, project / trait galleries, save controls with
 * debounced autosave, and Submit-to-Camp handoff.
 *
 * Inspired by Noundry Studio (CC0).
 */

'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import type { AppComponentProps } from '@/OS/types/app';
import { CompositePreview } from './components/CompositePreview';
import { LayersPanel } from './components/LayersPanel';
import { NewProjectDialog } from './components/NewProjectDialog';
import { PalettePanel } from './components/PalettePanel';
import { PixelCanvas } from './components/PixelCanvas';
import { ProjectGalleryDialog } from './components/ProjectGalleryDialog';
import { SaveControls } from './components/SaveControls';
import { StatusBar } from './components/StatusBar';
import { SubmitToCampSheet } from './components/SubmitToCampSheet';
import { ToolboxPanel } from './components/ToolboxPanel';
import { TraitGalleryDialog } from './components/TraitGalleryDialog';
import { useAutoSave } from './hooks/useAutoSave';
import { useDescriptorPalette } from './hooks/useDescriptorPalette';
import { useStudioKeybindings } from './hooks/useStudioKeybindings';
import { useLayers } from './model/layers';
import { useWorkspace } from './model/workspace';
import { NOUN_PARTS } from './types';
import { composeThumbnail } from './utils/composeThumbnail';
import { downloadDataUrl, slugify } from './utils/downloadDataUrl';
import styles from './Studio.module.css';

export function Studio({}: AppComponentProps) {
  useStudioKeybindings();
  useAutoSave();           // mount once — drives debounced background save
  useDescriptorPalette();  // mount once — hydrates the on-chain palette into store

  const { isConnected } = useAccount();
  const activePart = useWorkspace((s) => s.activePart);
  const setActivePart = useWorkspace((s) => s.setActivePart);
  const name = useWorkspace((s) => s.name);
  const getCanvases = useLayers((s) => s.getCanvases);

  function exportPng(): void {
    const dataUrl = composeThumbnail(getCanvases(), { size: 512 });
    if (!dataUrl) return;
    downloadDataUrl(dataUrl, `${slugify(name)}-512.png`);
  }

  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [projectGalleryOpen, setProjectGalleryOpen] = useState(false);
  const [traitGalleryOpen, setTraitGalleryOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);

  // Cmd+S → save now (delegates to SaveControls). We rebroadcast a click
  // to the Save button via a custom event to keep the source of truth in
  // one place.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key.toLowerCase() === 's') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('studio:save-shortcut'));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className={styles.studio}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.newProjectBtn}
          onClick={() => setNewProjectOpen(true)}
          title="Start blank, fork a Noun, or fork a single trait"
        >
          New / Fork…
        </button>
        <button
          type="button"
          className={styles.headerBtn}
          onClick={() => setProjectGalleryOpen(true)}
          disabled={!isConnected}
          title={isConnected ? 'Open a saved project' : 'Connect wallet to open projects'}
        >
          Open…
        </button>
        <button
          type="button"
          className={styles.headerBtn}
          onClick={() => setTraitGalleryOpen(true)}
          disabled={!isConnected}
          title={isConnected ? 'Browse saved traits' : 'Connect wallet to browse traits'}
        >
          Traits…
        </button>
        <button
          type="button"
          className={styles.headerBtn}
          onClick={exportPng}
          title="Export composite as 512×512 PNG"
        >
          Export PNG
        </button>

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

        <span className={styles.flex} />

        <SaveControls />

        <button
          type="button"
          className={styles.submitBtn}
          onClick={() => setSubmitOpen(true)}
          title="Submit selected layers to Camp as proposal candidate"
        >
          Submit to Camp →
        </button>
      </div>

      <div className={styles.body}>
        <ToolboxPanel />
        <PixelCanvas />
        <div className={styles.rightColumn}>
          <LayersPanel />
          <PalettePanel />
          <CompositePreview />
        </div>
      </div>

      <StatusBar />

      <NewProjectDialog
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
      />
      <ProjectGalleryDialog
        open={projectGalleryOpen}
        onClose={() => setProjectGalleryOpen(false)}
      />
      <TraitGalleryDialog
        open={traitGalleryOpen}
        onClose={() => setTraitGalleryOpen(false)}
      />
      <SubmitToCampSheet
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
      />
    </div>
  );
}

export default Studio;
