/**
 * FilterBar Component
 * Trait filter dropdowns and sort controls for Probe
 * Uses the Select primitive from Berry OS
 */

'use client';

import { useCallback, useMemo } from 'react';
import { Select, type SelectOption } from '@/OS/components/Primitives/Select';
import type { TraitType } from '@/app/lib/nouns/utils/trait-name-utils';
import type { ProbeFilters, ProbeSort } from '../hooks/useProbeNouns';
import type { TraitOptions, TraitOption } from '../hooks/useTraitOptions';
import { getTraitImageUrl } from '../utils/traitImages';
import styles from './FilterBar.module.css';

interface FilterBarProps {
  filters: ProbeFilters;
  sort: ProbeSort;
  traitOptions: TraitOptions;
  total: number;
  onFiltersChange: (filters: ProbeFilters) => void;
  onSortChange: (sort: ProbeSort) => void;
  onReset: () => void;
}

/**
 * Convert trait options to SelectOption[] with preview icons
 */
function toSelectOptions(traits: TraitOption[], traitType: TraitType): SelectOption[] {
  return traits.map((t) => ({
    value: String(t.index),
    label: t.name,
    icon: getTraitImageUrl(traitType, t.index),
  }));
}

export function FilterBar({
  filters,
  sort,
  traitOptions,
  total,
  onFiltersChange,
  onSortChange,
  onReset,
}: FilterBarProps) {
  const hasFilters =
    filters.background != null ||
    filters.body != null ||
    filters.accessory != null ||
    filters.head != null ||
    filters.glasses != null ||
    !!filters.settler ||
    !!filters.winner;

  // Memoize SelectOption arrays with trait preview icons
  const headOptions = useMemo(() => toSelectOptions(traitOptions.heads, 'head'), [traitOptions.heads]);
  const glassesOptions = useMemo(() => toSelectOptions(traitOptions.glasses, 'glasses'), [traitOptions.glasses]);
  const bodyOptions = useMemo(() => toSelectOptions(traitOptions.bodies, 'body'), [traitOptions.bodies]);
  const accessoryOptions = useMemo(() => toSelectOptions(traitOptions.accessories, 'accessory'), [traitOptions.accessories]);
  const backgroundOptions = useMemo(() => toSelectOptions(traitOptions.backgrounds, 'background'), [traitOptions.backgrounds]);

  const updateFilter = useCallback(
    (key: keyof ProbeFilters, value: string) => {
      const numericKeys = ['background', 'body', 'accessory', 'head', 'glasses'] as const;
      if ((numericKeys as readonly string[]).includes(key)) {
        onFiltersChange({
          ...filters,
          [key]: value === '' ? null : parseInt(value),
        });
      } else {
        onFiltersChange({
          ...filters,
          [key]: value === '' ? null : value,
        });
      }
    },
    [filters, onFiltersChange]
  );

  return (
    <div className={styles.filterBar}>
      <div className={styles.sortRow}>
        <button
          className={`${styles.sortButton} ${!hasFilters ? styles.active : ''}`}
          onClick={onReset}
        >
          RESET
        </button>
        <button
          className={`${styles.sortButton} ${sort === 'newest' ? styles.active : ''}`}
          onClick={() => onSortChange('newest')}
        >
          MOST RECENT
        </button>
        <button
          className={`${styles.sortButton} ${sort === 'oldest' ? styles.active : ''}`}
          onClick={() => onSortChange('oldest')}
        >
          OLDEST
        </button>
        <span className={styles.count}>{total.toLocaleString()} nouns</span>
      </div>

      <div className={styles.filtersRow}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>HEAD</label>
          <Select
            options={headOptions}
            value={filters.head != null ? String(filters.head) : ''}
            onChange={(v) => updateFilter('head', v)}
            placeholder="NONE"
            allowNone
            noneLabel="NONE"
          />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>GLASSES</label>
          <Select
            options={glassesOptions}
            value={filters.glasses != null ? String(filters.glasses) : ''}
            onChange={(v) => updateFilter('glasses', v)}
            placeholder="NONE"
            allowNone
            noneLabel="NONE"
          />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>BODY</label>
          <Select
            options={bodyOptions}
            value={filters.body != null ? String(filters.body) : ''}
            onChange={(v) => updateFilter('body', v)}
            placeholder="NONE"
            allowNone
            noneLabel="NONE"
          />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>ACCESSORY</label>
          <Select
            options={accessoryOptions}
            value={filters.accessory != null ? String(filters.accessory) : ''}
            onChange={(v) => updateFilter('accessory', v)}
            placeholder="NONE"
            allowNone
            noneLabel="NONE"
          />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>BACKGROUND</label>
          <Select
            options={backgroundOptions}
            value={filters.background != null ? String(filters.background) : ''}
            onChange={(v) => updateFilter('background', v)}
            placeholder="NONE"
            allowNone
            noneLabel="NONE"
          />
        </div>
      </div>
    </div>
  );
}
