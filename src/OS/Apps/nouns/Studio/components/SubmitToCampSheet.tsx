'use client';

/**
 * SubmitToCampSheet — pick which painted layer(s) to ship to Camp as
 * descriptor-add-trait actions. Emits one `studio:submit-trait` event per
 * selected layer, then launches Camp's proposal builder.
 *
 *   ┌─────────────────────────────────────────┐
 *   │ Submit to Camp                           │
 *   │  ☑ head        [thumb]                   │
 *   │  ☑ body        [thumb]                   │
 *   │  ☐ accessory   (empty — skip)            │
 *   │  ☐ glasses     [thumb]                   │
 *   │  ☐ background  [thumb]                   │
 *   │       [Cancel]   [Send 2 layers →]      │
 *   └─────────────────────────────────────────┘
 */

import { useEffect, useMemo, useState } from 'react';
import { Dialog } from '@/OS/Primitives';
import { appBus } from '@/OS/lib/EventBus';
import { appLauncher } from '@/OS/lib/AppLauncher';
import { useLayers } from '../model/layers';
import { usePalette } from '../model/palette';
import { useWorkspace } from '../model/workspace';
import {
  pixelArrayToThumbnail,
  solidColorThumbnail,
} from '../utils/pixelArrayToThumbnail';
import { serializeLayers } from '../utils/serializeWorkspace';
import { NOUN_PARTS, type NounPart } from '../types';
import type { TraitType } from '@/app/lib/studio/types';
import styles from './SubmitToCampSheet.module.css';

interface SubmitToCampSheetProps {
  open: boolean;
  onClose: () => void;
}

/** A layer counts as "painted" if it has at least one non-zero palette index. */
function isPainted(pixels: number[]): boolean {
  for (let i = 0; i < pixels.length; i++) if (pixels[i] !== 0) return true;
  return false;
}

export function SubmitToCampSheet({ open, onClose }: SubmitToCampSheetProps) {
  const projectId = useWorkspace((s) => s.projectId);
  const traitId = useWorkspace((s) => s.traitId);
  const projectName = useWorkspace((s) => s.name);
  const descriptor = usePalette((s) => s.descriptor);
  const getCanvases = useLayers((s) => s.getCanvases);

  // Snapshot current pixels every time the sheet opens.
  const [snapshot, setSnapshot] = useState<
    Record<TraitType, { pixels: number[]; painted: boolean; thumb: string }>
    | null
  >(null);

  useEffect(() => {
    if (!open) return;
    const canvases = getCanvases();
    const serialized = serializeLayers(canvases, descriptor);
    const out = {} as Record<
      TraitType,
      { pixels: number[]; painted: boolean; thumb: string }
    >;
    for (const part of NOUN_PARTS) {
      const layer = serialized[part as TraitType];
      const painted = isPainted(layer.pixels);
      const thumb =
        part === 'background'
          ? solidColorThumbnail(painted ? descriptor[layer.pixels[0]] : null, 1)
          : pixelArrayToThumbnail(layer.pixels, descriptor, 1);
      out[part as TraitType] = { pixels: layer.pixels, painted, thumb };
    }
    setSnapshot(out);
  }, [open, getCanvases, descriptor]);

  // Default selection: all painted layers.
  const [selected, setSelected] = useState<Set<TraitType>>(new Set());
  useEffect(() => {
    if (!snapshot) return;
    const next = new Set<TraitType>();
    for (const part of NOUN_PARTS) {
      if (snapshot[part as TraitType]?.painted) next.add(part as TraitType);
    }
    setSelected(next);
  }, [snapshot]);

  const toggle = (part: TraitType): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(part)) next.delete(part);
      else next.add(part);
      return next;
    });
  };

  const selectionCount = selected.size;
  const sendLabel = useMemo(() => {
    if (selectionCount === 0) return 'Pick a layer';
    return `Send ${selectionCount} layer${selectionCount === 1 ? '' : 's'} →`;
  }, [selectionCount]);

  function handleSubmit(): void {
    if (!snapshot || selectionCount === 0) return;
    // Launch Camp first so the listener is mounted when events arrive.
    appLauncher.launch('camp', {
      initialState: { path: 'create' },
    });
    // Defer the emits so Camp's view has time to subscribe.
    setTimeout(() => {
      for (const part of NOUN_PARTS) {
        const pt = part as TraitType;
        if (!selected.has(pt)) continue;
        const layer = snapshot[pt];
        appBus.emit('studio:submit-trait', {
          traitType: pt,
          pixels: layer.pixels,
          paletteSnapshot: descriptor,
          thumbnailDataUrl: layer.thumb,
          name: `${projectName} · ${pt}`,
          ...(projectId ? { sourceProjectId: projectId } : {}),
          ...(traitId ? { sourceTraitId: traitId } : {}),
        });
      }
      onClose();
    }, 150);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Submit to Camp"
      width={460}
      actions={[
        { label: 'Cancel', variant: 'default' },
        {
          label: sendLabel,
          variant: 'primary',
          onClick: handleSubmit,
          closeOnClick: false,
        },
      ]}
    >
      <div className={styles.body}>
        <p className={styles.intro}>
          Each selected layer becomes one
          <code className={styles.code}> Descriptor.addX(…) </code>
          action in a new proposal candidate. Painted layers are selected by
          default.
        </p>
        <ul className={styles.list}>
          {NOUN_PARTS.map((part) => {
            const pt = part as TraitType;
            const layer = snapshot?.[pt];
            const painted = !!layer?.painted;
            return (
              <li
                key={part}
                className={`${styles.row} ${!painted ? styles.rowDisabled : ''}`}
              >
                <label className={styles.label}>
                  <input
                    type="checkbox"
                    checked={selected.has(pt)}
                    disabled={!painted}
                    onChange={() => toggle(pt)}
                  />
                  <div className={styles.thumb}>
                    {layer?.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={layer.thumb}
                        alt={part}
                        className={styles.thumbImg}
                      />
                    ) : (
                      <div className={styles.thumbEmpty} />
                    )}
                  </div>
                  <div className={styles.meta}>
                    <span className={styles.partName}>{part}</span>
                    <span className={styles.partSub}>
                      {painted ? 'painted' : 'empty — skip'}
                    </span>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </Dialog>
  );
}
