'use client';

/**
 * useAutoSave — debounced background save of the current Studio workspace.
 *
 * Fires only when:
 *   - There is a wallet connected
 *   - The workspace has `projectId` (i.e. the user has saved at least once)
 *   - The workspace is `dirty`
 *
 * 2-second debounce, matches Berry's existing autosave cadence. The "Save"
 * UI in `SaveControls` reads the same `dirty` + `lastSavedAt` it exposes.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { useLayers } from '../model/layers';
import { usePalette } from '../model/palette';
import { useWorkspace } from '../model/workspace';
import { useUpdateStudioProject } from './useStudioProjects';
import { composeThumbnail } from '../utils/composeThumbnail';
import { serializeLayers } from '../utils/serializeWorkspace';

const DEBOUNCE_MS = 2000;

export interface AutoSaveState {
  saving: boolean;
  lastSavedAt: number | null;
  error: Error | null;
  /** Force an immediate save (returns the resulting project or null). */
  saveNow: () => Promise<void>;
}

export function useAutoSave(): AutoSaveState {
  const { address } = useAccount();
  const wallet = address?.toLowerCase();
  const projectId = useWorkspace((s) => s.projectId);
  const dirty = useWorkspace((s) => s.dirty);
  const setDirty = useWorkspace((s) => s.setDirty);
  const name = useWorkspace((s) => s.name);
  const customPalette = usePalette((s) => s.custom);
  const descriptor = usePalette((s) => s.descriptor);
  const getCanvases = useLayers((s) => s.getCanvases);
  const layers = useLayers((s) => s.layers);

  const update = useUpdateStudioProject();
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSave = useCallback(async () => {
    if (!wallet || !projectId) return;
    try {
      setSaving(true);
      setError(null);
      const canvases = getCanvases();
      const serialized = serializeLayers(canvases, descriptor);
      const thumbnailDataUrl = composeThumbnail(canvases, { size: 128 });
      await update.mutateAsync({
        id: projectId,
        input: {
          name,
          layers: serialized,
          paletteSnapshot: descriptor,
          customPalette,
          thumbnailDataUrl,
        },
      });
      setLastSavedAt(Date.now());
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setSaving(false);
    }
  }, [
    wallet,
    projectId,
    getCanvases,
    descriptor,
    customPalette,
    name,
    update,
    setDirty,
  ]);

  // Track per-layer history index. The first time we observe a NEW
  // fingerprint after a project is loaded, we mark workspace dirty and
  // schedule a debounced save.
  const fingerprint = Object.values(layers)
    .map((l) => l.historyIndex)
    .join(',');
  const baselineRef = useRef<string | null>(null);
  const lastProjectRef = useRef<string | null>(null);

  // Reset baseline whenever the active project changes (loading a project
  // bumps every layer's history; we don't want that to immediately save).
  useEffect(() => {
    if (projectId !== lastProjectRef.current) {
      lastProjectRef.current = projectId;
      baselineRef.current = fingerprint;
    }
  }, [projectId, fingerprint]);

  useEffect(() => {
    if (baselineRef.current === null) {
      baselineRef.current = fingerprint;
      return;
    }
    if (fingerprint === baselineRef.current) return;
    // Mark dirty regardless of save eligibility — the UI uses this to
    // show "unsaved" / "Save" affordances.
    setDirty(true);
    if (!projectId || !wallet) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void performSave();
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [projectId, wallet, fingerprint, performSave, setDirty]);

  // Suppress lint-only unused warning for `dirty` (consumed indirectly).
  void dirty;

  return {
    saving,
    lastSavedAt,
    error,
    saveNow: performSave,
  };
}
