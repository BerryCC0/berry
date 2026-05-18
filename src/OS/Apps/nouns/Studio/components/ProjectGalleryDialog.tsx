'use client';

/**
 * ProjectGalleryDialog — list saved Studio projects for the connected
 * wallet. Click a row to open it (loads layers into the workspace).
 *
 *   ┌─────────────────────────────────────────┐
 *   │ My Projects                       Status│
 *   │  ┌─┐  Name                              │
 *   │  │█│  Updated · 5 layers · status      │
 *   │  └─┘                                    │
 *   │  …                                      │
 *   └─────────────────────────────────────────┘
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog } from '@/OS/Primitives';
import { useLayers } from '../model/layers';
import { usePalette } from '../model/palette';
import { useWorkspace } from '../model/workspace';
import {
  useDeleteStudioProject,
  useDuplicateStudioProject,
  useStudioProject,
  useStudioProjects,
} from '../hooks/useStudioProjects';
import { deserializeLayers } from '../utils/serializeWorkspace';
import { NOUN_PARTS, type NounPart } from '../types';
import type {
  StudioProject,
  StudioProjectStatus,
} from '@/app/lib/studio/types';
import styles from './ProjectGalleryDialog.module.css';

interface ProjectGalleryDialogProps {
  open: boolean;
  onClose: () => void;
}

const STATUS_FILTERS: Array<{ id: 'all' | StudioProjectStatus; label: string }> =
  [
    { id: 'all', label: 'All' },
    { id: 'draft', label: 'Drafts' },
    { id: 'ready', label: 'Ready' },
    { id: 'archived', label: 'Archived' },
  ];

function shortTime(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function ProjectGalleryDialog({
  open,
  onClose,
}: ProjectGalleryDialogProps) {
  const [filter, setFilter] = useState<'all' | StudioProjectStatus>('all');
  const [openingId, setOpeningId] = useState<string | null>(null);

  const list = useStudioProjects(
    filter === 'all' ? undefined : { status: filter },
  );
  const opening = useStudioProject(openingId);
  const setProjectId = useWorkspace((s) => s.setProjectId);
  const setName = useWorkspace((s) => s.setName);
  const setMode = useWorkspace((s) => s.setMode);
  const setDirty = useWorkspace((s) => s.setDirty);
  const setActivePart = useWorkspace((s) => s.setActivePart);
  const setCustom = usePalette((s) => s.setCustom);
  const setDescriptor = usePalette((s) => s.setDescriptor);
  const descriptor = usePalette((s) => s.descriptor);
  const resetAll = useLayers((s) => s.resetAll);
  const loadImageData = useLayers((s) => s.loadImageData);
  const del = useDeleteStudioProject();
  const dup = useDuplicateStudioProject();

  const projects: StudioProject[] = useMemo(
    () => list.data ?? [],
    [list.data],
  );

  const applyProject = useCallback(
    (project: StudioProject) => {
      resetAll();
      if (project.paletteSnapshot && project.paletteSnapshot.length > 0) {
        setDescriptor(project.paletteSnapshot);
      }
      if (project.customPalette) setCustom(project.customPalette);
      const imageDatas = deserializeLayers(project);
      for (const part of NOUN_PARTS) {
        const data = imageDatas[part as NounPart];
        if (data) loadImageData(part as NounPart, data);
      }
      setProjectId(project.id);
      setName(project.name);
      setMode('project');
      setActivePart('head');
      setDirty(false);
    },
    [
      resetAll,
      setDescriptor,
      setCustom,
      loadImageData,
      setProjectId,
      setName,
      setMode,
      setActivePart,
      setDirty,
    ],
  );

  // When the user clicks a row, we kick off a fetch by setting `openingId`
  // and the `useStudioProject` query above hydrates. When it resolves we
  // apply and close.
  useEffect(() => {
    if (opening.data && opening.data.id === openingId) {
      applyProject(opening.data);
      setOpeningId(null);
      onClose();
    }
  }, [opening.data, openingId, applyProject, onClose]);

  // Reference `descriptor` to satisfy unused-deps lint while documenting
  // that we rely on the workspace palette as a fallback during deserialize.
  void descriptor;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Open Project"
      width={680}
      actions={[{ label: 'Close', variant: 'default' }]}
    >
      <div className={styles.body}>
        <div className={styles.filterRow}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`${styles.filterTab} ${filter === f.id ? styles.filterActive : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
          <span className={styles.flex} />
          <button
            type="button"
            className={styles.miniButton}
            onClick={() => list.refetch()}
            disabled={list.isFetching}
          >
            {list.isFetching ? '…' : '↻'}
          </button>
        </div>

        {list.isLoading && <p className={styles.message}>Loading…</p>}
        {list.error && (
          <p className={`${styles.message} ${styles.errorMessage}`}>
            {(list.error as Error).message}
          </p>
        )}
        {!list.isLoading && !list.error && projects.length === 0 && (
          <p className={styles.message}>
            No projects yet — start drawing and use Save As… to create one.
          </p>
        )}

        <ul className={styles.list}>
          {projects.map((p) => (
            <li key={p.id} className={styles.row}>
              <button
                type="button"
                className={styles.rowOpen}
                onClick={() => setOpeningId(p.id)}
                disabled={opening.isFetching}
              >
                <div className={styles.thumb}>
                  {p.thumbnailDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.thumbnailDataUrl}
                      alt={p.name}
                      className={styles.thumbImg}
                    />
                  ) : (
                    <div className={styles.thumbEmpty}>no preview</div>
                  )}
                </div>
                <div className={styles.meta}>
                  <span className={styles.name}>{p.name}</span>
                  <span className={styles.sub}>
                    {shortTime(p.updatedAt)} · {p.status}
                  </span>
                </div>
              </button>
              <div className={styles.rowActions}>
                <button
                  type="button"
                  className={styles.miniButton}
                  onClick={() => dup.mutate(p.id)}
                  disabled={dup.isPending}
                  title="Duplicate"
                >
                  Dup
                </button>
                <button
                  type="button"
                  className={`${styles.miniButton} ${styles.danger}`}
                  onClick={() => {
                    if (confirm(`Delete "${p.name}"?`)) del.mutate(p.id);
                  }}
                  disabled={del.isPending}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}
