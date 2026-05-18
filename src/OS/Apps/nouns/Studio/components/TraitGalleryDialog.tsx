'use client';

/**
 * TraitGalleryDialog — list saved standalone traits for the connected
 * wallet. Filterable by trait type and status. Each row offers Open
 * (loads into the matching layer + switches to trait mode), Delete,
 * and shows submission status.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog } from '@/OS/Primitives';
import { useLayers } from '../model/layers';
import { useWorkspace } from '../model/workspace';
import {
  useDeleteStudioTrait,
  useStudioTrait,
  useStudioTraits,
} from '../hooks/useStudioTraits';
import { pixelArrayToImageData } from '../utils/pixelArrayToImageData';
import { NOUN_PARTS, type NounPart } from '../types';
import type {
  StudioTrait,
  StudioTraitStatus,
  TraitType,
} from '@/app/lib/studio/types';
import styles from './TraitGalleryDialog.module.css';

interface TraitGalleryDialogProps {
  open: boolean;
  onClose: () => void;
}

const STATUS_FILTERS: Array<{ id: 'all' | StudioTraitStatus; label: string }> =
  [
    { id: 'all', label: 'All' },
    { id: 'draft', label: 'Drafts' },
    { id: 'ready', label: 'Ready' },
    { id: 'submitted', label: 'Submitted' },
    { id: 'archived', label: 'Archived' },
  ];

const TRAIT_FILTERS: Array<{ id: 'all' | TraitType; label: string }> = [
  { id: 'all', label: 'All' },
  ...NOUN_PARTS.map((p) => ({ id: p as TraitType, label: p })),
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

export function TraitGalleryDialog({ open, onClose }: TraitGalleryDialogProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | StudioTraitStatus>(
    'all',
  );
  const [traitFilter, setTraitFilter] = useState<'all' | TraitType>('all');
  const [openingId, setOpeningId] = useState<string | null>(null);

  const list = useStudioTraits({
    status: statusFilter === 'all' ? undefined : statusFilter,
    traitType: traitFilter === 'all' ? undefined : traitFilter,
  });
  const opening = useStudioTrait(openingId);
  const setTraitId = useWorkspace((s) => s.setTraitId);
  const setProjectId = useWorkspace((s) => s.setProjectId);
  const setName = useWorkspace((s) => s.setName);
  const setMode = useWorkspace((s) => s.setMode);
  const setActivePart = useWorkspace((s) => s.setActivePart);
  const setDirty = useWorkspace((s) => s.setDirty);
  const resetAll = useLayers((s) => s.resetAll);
  const loadImageData = useLayers((s) => s.loadImageData);
  const del = useDeleteStudioTrait();

  const traits: StudioTrait[] = useMemo(() => list.data ?? [], [list.data]);

  const applyTrait = useCallback(
    (trait: StudioTrait) => {
      resetAll();
      const part = trait.traitType as NounPart;
      const imageData = pixelArrayToImageData(
        trait.pixelData.pixels,
        trait.paletteSnapshot,
      );
      loadImageData(part, imageData);
      setTraitId(trait.id);
      setProjectId(null);
      setName(trait.name);
      setMode('trait');
      setActivePart(part);
      setDirty(false);
    },
    [
      resetAll,
      loadImageData,
      setTraitId,
      setProjectId,
      setName,
      setMode,
      setActivePart,
      setDirty,
    ],
  );

  useEffect(() => {
    if (opening.data && opening.data.id === openingId) {
      applyTrait(opening.data);
      setOpeningId(null);
      onClose();
    }
  }, [opening.data, openingId, applyTrait, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Open Trait"
      width={680}
      actions={[{ label: 'Close', variant: 'default' }]}
    >
      <div className={styles.body}>
        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>Status</span>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`${styles.filterTab} ${statusFilter === f.id ? styles.filterActive : ''}`}
              onClick={() => setStatusFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>Type</span>
          {TRAIT_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`${styles.filterTab} ${traitFilter === f.id ? styles.filterActive : ''}`}
              onClick={() => setTraitFilter(f.id)}
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
        {!list.isLoading && !list.error && traits.length === 0 && (
          <p className={styles.message}>
            No traits yet — extract one from a project, or save the current
            layer as a standalone trait.
          </p>
        )}

        <ul className={styles.list}>
          {traits.map((t) => (
            <li key={t.id} className={styles.row}>
              <button
                type="button"
                className={styles.rowOpen}
                onClick={() => setOpeningId(t.id)}
                disabled={opening.isFetching}
              >
                <div className={styles.thumb}>
                  {t.thumbnailDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.thumbnailDataUrl}
                      alt={t.name}
                      className={styles.thumbImg}
                    />
                  ) : (
                    <div className={styles.thumbEmpty}>{t.traitType}</div>
                  )}
                </div>
                <div className={styles.meta}>
                  <span className={styles.name}>{t.name}</span>
                  <span className={styles.sub}>
                    {t.traitType} · {shortTime(t.updatedAt)} · {t.status}
                  </span>
                </div>
              </button>
              <div className={styles.rowActions}>
                <button
                  type="button"
                  className={`${styles.miniButton} ${styles.danger}`}
                  onClick={() => {
                    if (confirm(`Delete "${t.name}"?`)) del.mutate(t.id);
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
