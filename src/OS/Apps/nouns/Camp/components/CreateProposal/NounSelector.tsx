/**
 * NounSelector Component
 * Visual grid selector for Nouns with rendered images
 */

'use client';

import React from 'react';
import type { NounWithSVG } from '../../utils/hooks/useNounSelector';
import styles from './NounSelector.module.css';

interface NounSelectorProps {
  nouns: NounWithSVG[];
  selectedId: string | null;
  onSelect: (nounId: string) => void;
  label: string;
  loading: boolean;
  disabled?: boolean;
  emptyMessage?: string;
}

export function NounSelector({
  nouns,
  selectedId,
  onSelect,
  label,
  loading,
  disabled = false,
  emptyMessage = 'No Nouns found',
}: NounSelectorProps) {
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.label}>{label}</div>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <span className={styles.loadingText}>Loading Nouns...</span>
        </div>
      </div>
    );
  }

  if (nouns.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.label}>{label}</div>
        <div className={styles.emptyState}>
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.label}>{label}</div>
      <div className={styles.grid}>
        {nouns.map((noun) => (
          <button
            key={noun.id}
            type="button"
            className={`${styles.nounCard} ${selectedId === noun.id ? styles.selected : ''} ${disabled ? styles.disabled : ''}`}
            onClick={() => !disabled && onSelect(noun.id)}
            disabled={disabled}
          >
            {noun.svgDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={noun.svgDataUrl}
                alt={`Noun ${noun.id}`}
                className={styles.nounImage}
              />
            ) : (
              <div className={styles.nounPlaceholder}>
                <span className={styles.nounId}>#{noun.id}</span>
              </div>
            )}
            <div className={styles.nounLabel}>
              Noun {noun.id}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
