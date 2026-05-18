'use client';

/**
 * NewProjectDialog — the entry point for "New" / "Fork" actions.
 *
 * Three tabs:
 *   - Blank: name the project, start from empty layers.
 *   - Fork Noun: load all 5 layers from an existing Noun's traits.
 *   - Fork Trait: load one trait into one chosen layer.
 *
 * On confirm we call the relevant store actions (`useLayers.resetAll`,
 * `useLayers.loadImageData`, `useWorkspace.setName`, etc.) and close.
 */

import { useCallback, useState } from 'react';
import { Dialog } from '@/OS/Primitives';
import { useLayers } from '../model/layers';
import { useWorkspace } from '../model/workspace';
import { useBundledTraits } from '../hooks/useBundledTraits';
import {
  bundledBackgroundColor,
  decodeBundledTrait,
} from '../utils/decodeBundledTrait';
import {
  pixelArrayToImageData,
  solidColorImageData,
} from '../utils/pixelArrayToImageData';
import { NOUN_PARTS, type NounPart } from '../types';
import { ForkNounPicker, type ForkNounResolved } from './ForkNounPicker';
import { ForkTraitPicker } from './ForkTraitPicker';
import styles from './NewProjectDialog.module.css';

type TabId = 'blank' | 'forkNoun' | 'forkTrait';

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewProjectDialog({ open, onClose }: NewProjectDialogProps) {
  const [tab, setTab] = useState<TabId>('blank');
  const [name, setName] = useState('Untitled');

  // Fork Noun state
  const [forkNoun, setForkNoun] = useState<ForkNounResolved | null>(null);

  // Fork Trait state
  const [forkTrait, setForkTrait] = useState<{
    part: NounPart;
    index: number;
  } | null>(null);

  const bundled = useBundledTraits();
  const resetAll = useLayers((s) => s.resetAll);
  const loadImageData = useLayers((s) => s.loadImageData);
  const setName_ = useWorkspace((s) => s.setName);
  const setActivePart = useWorkspace((s) => s.setActivePart);
  const setDirty = useWorkspace((s) => s.setDirty);

  const reset = useCallback(() => {
    setTab('blank');
    setName('Untitled');
    setForkNoun(null);
    setForkTrait(null);
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    reset();
  }, [onClose, reset]);

  const loadTraitIntoLayer = useCallback(
    (part: NounPart, index: number) => {
      if (part === 'background') {
        const color = bundledBackgroundColor(index);
        loadImageData(part, solidColorImageData(color));
        return;
      }
      const decoded = decodeBundledTrait(part, index);
      const imageData = pixelArrayToImageData(decoded.pixels, bundled.palette);
      loadImageData(part, imageData);
    },
    [bundled.palette, loadImageData],
  );

  const handleCreate = useCallback(() => {
    if (tab === 'blank') {
      resetAll();
      setName_(name.trim() || 'Untitled');
      setActivePart('head');
      setDirty(false);
      handleClose();
      return;
    }

    if (tab === 'forkNoun') {
      if (!forkNoun) return;
      resetAll();
      for (const part of NOUN_PARTS) {
        const idx =
          part === 'background'
            ? forkNoun.background
            : part === 'body'
              ? forkNoun.body
              : part === 'accessory'
                ? forkNoun.accessory
                : part === 'head'
                  ? forkNoun.head
                  : forkNoun.glasses;
        loadTraitIntoLayer(part, idx);
      }
      setName_(name.trim() || `Fork of Noun ${forkNoun.id}`);
      setActivePart('head');
      setDirty(false);
      handleClose();
      return;
    }

    if (tab === 'forkTrait') {
      if (!forkTrait) return;
      resetAll();
      loadTraitIntoLayer(forkTrait.part, forkTrait.index);
      setName_(name.trim() || `Fork of ${forkTrait.part} #${forkTrait.index}`);
      setActivePart(forkTrait.part);
      setDirty(false);
      handleClose();
      return;
    }
  }, [
    tab,
    name,
    forkNoun,
    forkTrait,
    resetAll,
    setName_,
    setActivePart,
    setDirty,
    loadTraitIntoLayer,
    handleClose,
  ]);

  const createDisabled =
    (tab === 'forkNoun' && !forkNoun) || (tab === 'forkTrait' && !forkTrait);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="New Studio Project"
      width={620}
      actions={[
        { label: 'Cancel', variant: 'default' },
        {
          label: tab === 'blank' ? 'Create' : 'Create from this',
          variant: 'primary',
          onClick: handleCreate,
          closeOnClick: false,
        },
      ]}
    >
      <div className={styles.body}>
        <div className={styles.tabRow} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'blank'}
            className={`${styles.tab} ${tab === 'blank' ? styles.activeTab : ''}`}
            onClick={() => setTab('blank')}
          >
            Blank
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'forkNoun'}
            className={`${styles.tab} ${tab === 'forkNoun' ? styles.activeTab : ''}`}
            onClick={() => setTab('forkNoun')}
          >
            Fork Noun
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'forkTrait'}
            className={`${styles.tab} ${tab === 'forkTrait' ? styles.activeTab : ''}`}
            onClick={() => setTab('forkTrait')}
          >
            Fork Trait
          </button>
        </div>

        <div className={styles.tabPanel}>
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Project name</span>
            <input
              className={styles.input}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Untitled"
            />
          </div>

          {tab === 'blank' && (
            <p className={styles.hint}>
              Start with five empty 32×32 layers. Pick a tool and start drawing
              — your changes auto-save under the project name above.
            </p>
          )}

          {tab === 'forkNoun' && (
            <ForkNounPicker onResolved={setForkNoun} />
          )}

          {tab === 'forkTrait' && (
            <ForkTraitPicker
              initialPart="head"
              onSelect={(part, index) => setForkTrait({ part, index })}
              selectedIndex={forkTrait?.index}
            />
          )}

          {createDisabled && (
            <p className={styles.hint}>
              {tab === 'forkNoun'
                ? 'Enter a Noun ID and click Load to continue.'
                : 'Pick a trait above to continue.'}
            </p>
          )}
        </div>
      </div>
    </Dialog>
  );
}
