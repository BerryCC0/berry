'use client';

/**
 * ForkNounPicker — pick a Noun by ID, see a preview of its 5 traits.
 *
 * Uses Berry's existing `useNoun(id)` hook (which hits `/api/nouns/[id]` →
 * Ponder cache). The cached Noun row gives us trait indices for background,
 * body, accessory, head, and glasses, which we look up in the bundled trait
 * catalog to render thumbnails.
 *
 * The dialog's "Create" action reads the resolved indices via the optional
 * `onResolved` callback so it can call `useLayers.loadImageData` for each
 * layer.
 */

import { useEffect, useState } from 'react';
import { useNoun } from '@/app/lib/nouns/hooks/useNoun';
import { useBundledTraits } from '../hooks/useBundledTraits';
import { NOUN_PARTS, type NounPart } from '../types';
import styles from './ForkNounPicker.module.css';

export interface ForkNounResolved {
  id: number;
  background: number;
  body: number;
  accessory: number;
  head: number;
  glasses: number;
}

interface ForkNounPickerProps {
  /** Fires whenever a valid Noun is resolved (so the parent dialog can enable Create). */
  onResolved: (resolved: ForkNounResolved | null) => void;
}

export function ForkNounPicker({ onResolved }: ForkNounPickerProps) {
  const bundled = useBundledTraits();
  const [input, setInput] = useState('1');
  const [submittedId, setSubmittedId] = useState<number | null>(1);

  const { data: noun, isLoading, error } = useNoun(submittedId ?? undefined);

  useEffect(() => {
    if (!noun) {
      onResolved(null);
      return;
    }
    onResolved({
      id: noun.id,
      background: noun.background,
      body: noun.body,
      accessory: noun.accessory,
      head: noun.head,
      glasses: noun.glasses,
    });
  }, [noun, onResolved]);

  const handleLoad = () => {
    const trimmed = input.trim();
    const id = Number(trimmed);
    if (!Number.isInteger(id) || id < 0) return;
    setSubmittedId(id);
  };

  return (
    <div className={styles.root}>
      <div className={styles.row}>
        <span className={styles.label}>Noun ID</span>
        <input
          className={styles.input}
          type="text"
          inputMode="numeric"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleLoad();
          }}
          placeholder="e.g. 1234"
        />
        <button
          type="button"
          className={styles.loadBtn}
          onClick={handleLoad}
          disabled={isLoading}
        >
          {isLoading ? 'Loading…' : 'Load'}
        </button>
      </div>

      {error && (
        <div className={styles.errorText}>
          Couldn&apos;t load Noun #{submittedId}. Check the ID and try again.
        </div>
      )}

      {noun && (
        <div className={styles.preview}>
          <NounPreview noun={noun} bundled={bundled} />
          <div className={styles.partList}>
            <div className={styles.partRow}>
              <span className={styles.partKey}>Noun</span>
              <span>#{noun.id}</span>
            </div>
            {NOUN_PARTS.map((p) => {
              const idx = traitIndex(p, noun);
              const label = traitLabel(p, idx, bundled);
              return (
                <div key={p} className={styles.partRow}>
                  <span className={styles.partKey}>{p}</span>
                  <span>
                    #{idx} {label ? `· ${label}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className={styles.hint}>
        Forking a Noun replaces all 5 layers with copies of that Noun&apos;s
        traits. You can edit each layer afterwards.
      </p>
    </div>
  );
}

function traitIndex(part: NounPart, noun: ForkNounResolved): number {
  switch (part) {
    case 'background':
      return noun.background;
    case 'body':
      return noun.body;
    case 'accessory':
      return noun.accessory;
    case 'head':
      return noun.head;
    case 'glasses':
      return noun.glasses;
  }
}

function traitLabel(
  part: NounPart,
  index: number,
  bundled: ReturnType<typeof useBundledTraits>,
): string | null {
  const meta = bundled[part][index];
  return meta?.filename ?? null;
}

interface NounPreviewProps {
  noun: ForkNounResolved;
  bundled: ReturnType<typeof useBundledTraits>;
}

function NounPreview({ noun, bundled }: NounPreviewProps) {
  return (
    <div className={styles.previewCanvas}>
      {NOUN_PARTS.map((p) => {
        const idx = traitIndex(p, noun);
        const meta = bundled[p][idx];
        if (!meta) return null;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={p}
            className={styles.previewLayer}
            src={meta.thumbnailDataUrl}
            alt={p}
          />
        );
      })}
    </div>
  );
}
