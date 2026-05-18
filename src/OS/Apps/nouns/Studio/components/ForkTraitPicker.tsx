'use client';

/**
 * ForkTraitPicker — pick a single trait by part + index.
 *
 * Used by NewProjectDialog's "Fork Trait" tab and by the per-layer "replace
 * from existing trait" action. The caller decides what to do with the
 * resulting (part, index) pair.
 *
 * Bundled traits are the default view. A "Refresh from chain" button switches
 * to a fresh on-chain pull (useOnChainTraits).
 */

import { useState } from 'react';
import { useBundledTraits } from '../hooks/useBundledTraits';
import { useOnChainTraits } from '../hooks/useOnChainTraits';
import { NOUN_PARTS, type NounPart } from '../types';
import styles from './ForkTraitPicker.module.css';

interface ForkTraitPickerProps {
  /** Initial part to show. Defaults to 'head'. */
  initialPart?: NounPart;
  /** Locks the part selector when set (i.e. picker is opened for a specific layer). */
  lockedPart?: NounPart;
  /** Called whenever the user clicks a tile. */
  onSelect: (part: NounPart, index: number) => void;
  /** Index of the currently-highlighted tile (for confirm flows). */
  selectedIndex?: number;
  /** Hide the part selector entirely. */
  hidePartTabs?: boolean;
}

export function ForkTraitPicker({
  initialPart = 'head',
  lockedPart,
  onSelect,
  selectedIndex,
  hidePartTabs = false,
}: ForkTraitPickerProps) {
  const bundled = useBundledTraits();
  const [part, setPart] = useState<NounPart>(lockedPart ?? initialPart);
  const [chainMode, setChainMode] = useState(false);

  const onChain = useOnChainTraits(part, { enabled: chainMode });

  const tiles = chainMode
    ? onChain.traits.map((t) => ({
        index: t.index,
        filename: `#${t.index}`,
        thumbnailDataUrl: t.thumbnailDataUrl,
      }))
    : bundled[part];

  const refreshing = chainMode && (onChain.isLoadingCount || onChain.isLoadingTraits);

  return (
    <div className={styles.root}>
      {!hidePartTabs && !lockedPart && (
        <div className={styles.tabs}>
          {NOUN_PARTS.map((p) => (
            <button
              key={p}
              type="button"
              className={`${styles.tab} ${part === p ? styles.activeTab : ''}`}
              onClick={() => {
                setPart(p);
                setChainMode(false);
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div className={styles.grid} role="listbox" aria-label={`${part} traits`}>
        {tiles.map((t) => {
          const active = selectedIndex === t.index;
          return (
            <button
              key={t.index}
              type="button"
              className={`${styles.tile} ${active ? styles.tileActive : ''}`}
              onClick={() => onSelect(part, t.index)}
              title={t.filename}
              aria-selected={active}
              role="option"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.thumb}
                src={t.thumbnailDataUrl}
                alt={t.filename}
              />
              <span className={styles.tileLabel}>#{t.index}</span>
            </button>
          );
        })}
        {tiles.length === 0 && (
          <span className={styles.statusText}>
            {refreshing ? 'Loading from chain…' : 'No traits available.'}
          </span>
        )}
      </div>

      <div className={styles.footer}>
        <span className={styles.statusText}>
          {chainMode
            ? onChain.count !== null
              ? `${onChain.traits.length} of ${onChain.count} on-chain ${part}${part === 'glasses' ? '' : 's'}`
              : 'Reading chain…'
            : `${tiles.length} bundled ${part}${part === 'glasses' ? '' : 's'}`}
        </span>
        <button
          type="button"
          className={styles.refreshBtn}
          disabled={refreshing}
          onClick={() => setChainMode((prev) => !prev)}
        >
          {refreshing
            ? 'Loading…'
            : chainMode
              ? 'Use bundled'
              : 'Refresh from chain'}
        </button>
      </div>
    </div>
  );
}
