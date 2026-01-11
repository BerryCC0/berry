/**
 * TraitsList Component
 * Displays Noun traits in a compact list
 */

'use client';

import { useTranslation } from '@/OS/lib/i18n';
import { getTraitName } from '@/app/lib/nouns/utils/trait-name-utils';
import type { NounSeed } from '../hooks/useAuctionData';
import styles from './TraitsList.module.css';

interface TraitsListProps {
  seed: NounSeed | null;
  loading?: boolean;
}

export function TraitsList({ seed, loading = false }: TraitsListProps) {
  const { t } = useTranslation();

  const traitLabels = [
    { key: 'head', label: t('auction.traits.head') },
    { key: 'glasses', label: t('auction.traits.glasses') },
    { key: 'body', label: t('auction.traits.body') },
    { key: 'accessory', label: t('auction.traits.accessory') },
    { key: 'background', label: t('auction.traits.background') },
  ];

  if (loading) {
    return (
      <div className={styles.traitsList}>
        {traitLabels.map(({ key, label }) => (
          <div key={key} className={styles.traitItem}>
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
          <span className={styles.traitLabel}>{t('auction.traits.title')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.traitsList}>
      <div className={styles.traitItem}>
        <span className={styles.traitLabel}>{t('auction.traits.head')}</span>
        <span className={styles.traitValue}>
          {getTraitName('head', Number(seed.head))}
        </span>
      </div>
      <div className={styles.traitItem}>
        <span className={styles.traitLabel}>{t('auction.traits.glasses')}</span>
        <span className={styles.traitValue}>
          {getTraitName('glasses', Number(seed.glasses))}
        </span>
      </div>
      <div className={styles.traitItem}>
        <span className={styles.traitLabel}>{t('auction.traits.body')}</span>
        <span className={styles.traitValue}>
          {getTraitName('body', Number(seed.body))}
        </span>
      </div>
      <div className={styles.traitItem}>
        <span className={styles.traitLabel}>{t('auction.traits.accessory')}</span>
        <span className={styles.traitValue}>
          {getTraitName('accessory', Number(seed.accessory))}
        </span>
      </div>
      <div className={styles.traitItem}>
        <span className={styles.traitLabel}>{t('auction.traits.background')}</span>
        <span className={styles.traitValue}>
          {getTraitName('background', Number(seed.background))}
        </span>
      </div>
    </div>
  );
}

