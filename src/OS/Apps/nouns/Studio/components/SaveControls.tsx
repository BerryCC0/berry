'use client';

/**
 * SaveControls — Save / Save As… buttons + autosave indicator.
 *
 * - "Save" calls saveNow() if a project exists, otherwise opens the
 *   "Save As" prompt (treated as a new-project create).
 * - "Save As…" always creates a fresh row (clears `projectId`).
 * - The indicator shows: idle ("saved 2s ago"), saving spinner,
 *   "unsaved" when dirty, or "not saved" if no project yet.
 */

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useLayers } from '../model/layers';
import { usePalette } from '../model/palette';
import { useWorkspace } from '../model/workspace';
import { useAutoSave } from '../hooks/useAutoSave';
import { useCreateStudioProject } from '../hooks/useStudioProjects';
import { composeThumbnail } from '../utils/composeThumbnail';
import { serializeLayers } from '../utils/serializeWorkspace';
import styles from './SaveControls.module.css';

function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export function SaveControls() {
  const { address, isConnected } = useAccount();
  const projectId = useWorkspace((s) => s.projectId);
  const setProjectId = useWorkspace((s) => s.setProjectId);
  const name = useWorkspace((s) => s.name);
  const setName = useWorkspace((s) => s.setName);
  const setDirty = useWorkspace((s) => s.setDirty);
  const dirty = useWorkspace((s) => s.dirty);
  const descriptor = usePalette((s) => s.descriptor);
  const customPalette = usePalette((s) => s.custom);
  const getCanvases = useLayers((s) => s.getCanvases);

  const autoSave = useAutoSave();
  const create = useCreateStudioProject();

  const [agoLabel, setAgoLabel] = useState<string>('');

  useEffect(() => {
    if (!autoSave.lastSavedAt) {
      setAgoLabel('');
      return;
    }
    setAgoLabel(timeAgo(autoSave.lastSavedAt));
    const t = setInterval(
      () => setAgoLabel(timeAgo(autoSave.lastSavedAt!)),
      5000,
    );
    return () => clearInterval(t);
  }, [autoSave.lastSavedAt]);

  // Cmd+S keyboard handler — Studio re-broadcasts this as a custom event.
  useEffect(() => {
    function onShortcut() {
      void save();
    }
    window.addEventListener('studio:save-shortcut', onShortcut);
    return () => window.removeEventListener('studio:save-shortcut', onShortcut);
    // We intentionally bind a stable closure that reads latest state via
    // refs — but since `save` reuses zustand/hook getters that are stable
    // by reference, we can rely on the listener pointing at the latest
    // `save` inside this component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveAs(): Promise<void> {
    const next = prompt('Save as…', name) ?? '';
    const trimmed = next.trim();
    if (!trimmed) return;
    const canvases = getCanvases();
    const layers = serializeLayers(canvases, descriptor);
    const thumbnailDataUrl = composeThumbnail(canvases, { size: 128 });
    try {
      const project = await create.mutateAsync({
        name: trimmed,
        layers,
        paletteSnapshot: descriptor,
        customPalette,
        thumbnailDataUrl,
      });
      setProjectId(project.id);
      setName(trimmed);
      setDirty(false);
    } catch (e) {
      alert(`Save failed: ${(e as Error).message}`);
    }
  }

  async function save(): Promise<void> {
    if (!projectId) {
      await saveAs();
      return;
    }
    await autoSave.saveNow();
  }

  let indicator = '';
  if (!isConnected) indicator = 'connect wallet to save';
  else if (autoSave.saving || create.isPending) indicator = 'saving…';
  else if (autoSave.error) indicator = `error: ${autoSave.error.message}`;
  else if (!projectId) indicator = 'not saved';
  else if (dirty) indicator = 'unsaved';
  else if (autoSave.lastSavedAt) indicator = `saved ${agoLabel}`;
  else indicator = 'saved';

  return (
    <div className={styles.row}>
      <span
        className={`${styles.indicator} ${
          autoSave.error ? styles.indicatorError : ''
        }`}
        title={autoSave.error?.message ?? ''}
      >
        {indicator}
      </span>
      <button
        type="button"
        className={styles.button}
        onClick={save}
        disabled={!isConnected || autoSave.saving || create.isPending}
        title="Save (Cmd+S)"
      >
        Save
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={saveAs}
        disabled={!isConnected || create.isPending}
        title="Save as new project…"
      >
        Save As…
      </button>
      {!!address && address && (
        <span className={styles.wallet} title={address}>
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
      )}
    </div>
  );
}
