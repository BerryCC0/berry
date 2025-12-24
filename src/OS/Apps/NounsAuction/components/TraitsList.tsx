/**
 * TraitsList Component
 * Displays Noun traits in a compact list
 */

'use client';

import { getTraitName } from '@/app/lib/nouns/utils/trait-name-utils';
import type { NounSeed } from '../hooks/useAuctionData';
import styles from './TraitsList.module.css';

interface TraitsListProps {
  seed: NounSeed | null;
  loading?: boolean;
}

export function TraitsList({ seed, loading = false }: TraitsListProps) {
  if (loading) {
    return (
      <div className={styles.traitsList}>
        {['Head', 'Glasses', 'Body', 'Accessory', 'BG'].map((label) => (
          <div key={label} className={styles.traitItem}>
            <span className={styles.traitLabel}>{label}</span>
            <span className={styles.traitValue}>...</span>
          </div>
        ))}
      </div>
    );
  }

  if (!seed) {
    return (
      <div className={styles.traitsList}>
        <div className={styles.traitItem}>
          <span className={styles.traitLabel}>No traits</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.traitsList}>
      <div className={styles.traitItem}>
        <span className={styles.traitLabel}>Head</span>
        <span className={styles.traitValue}>
          {getTraitName('head', Number(seed.head))}
        </span>
      </div>
      <div className={styles.traitItem}>
        <span className={styles.traitLabel}>Glasses</span>
        <span className={styles.traitValue}>
          {getTraitName('glasses', Number(seed.glasses))}
        </span>
      </div>
      <div className={styles.traitItem}>
        <span className={styles.traitLabel}>Body</span>
        <span className={styles.traitValue}>
          {getTraitName('body', Number(seed.body))}
        </span>
      </div>
      <div className={styles.traitItem}>
        <span className={styles.traitLabel}>Accessory</span>
        <span className={styles.traitValue}>
          {getTraitName('accessory', Number(seed.accessory))}
        </span>
      </div>
      <div className={styles.traitItem}>
        <span className={styles.traitLabel}>BG</span>
        <span className={styles.traitValue}>
          {getTraitName('background', Number(seed.background))}
        </span>
      </div>
    </div>
  );
}

