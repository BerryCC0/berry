/**
 * V2 Probe filter bar — trait / owner / winner / settler dropdowns, sort
 * toggles, reset, and a live count. Trait labels are index-based (V2 has no
 * on-chain name registry); options are derived from the actual noun set.
 */

'use client';

import { useMemo } from 'react';
import { Select, type SelectOption } from '@/OS/Primitives';
import type { EnsMap } from '@/OS/hooks/useEnsData';
import { getEnsFromMap } from '@/OS/hooks/useEnsData';
import { getV2TraitLabel } from '../utils/traitLabels';
import { truncateAddr } from '../utils/format';
import {
  TRAIT_FILTERS,
  deriveTraitOptions,
  deriveAddressOptions,
  hasActiveFilters,
  type V2ProbeFilters,
  type V2ProbeSort,
} from '../utils/probeFilter';
import type { V2ProbeNoun } from '../hooks/useV2ProbeNouns';
import styles from './V2ProbeFilterBar.module.css';

interface Props {
  allNouns: V2ProbeNoun[];
  filters: V2ProbeFilters;
  sort: V2ProbeSort;
  total: number;
  ensMap: EnsMap;
  onFiltersChange: (filters: V2ProbeFilters) => void;
  onSortChange: (sort: V2ProbeSort) => void;
  onReset: () => void;
}

const SORT_TOGGLES: { sorts: [V2ProbeSort, V2ProbeSort]; labels: [string, string] }[] = [
  { sorts: ['newest', 'oldest'], labels: ['MOST RECENT', 'OLDEST'] },
  { sorts: ['largest', 'smallest'], labels: ['LARGEST', 'SMALLEST'] },
];

export function V2ProbeFilterBar({
  allNouns,
  filters,
  sort,
  total,
  ensMap,
  onFiltersChange,
  onSortChange,
  onReset,
}: Props) {
  const isDefault = !hasActiveFilters(filters) && sort === 'newest';

  const addressOptions = useMemo(() => {
    const toOptions = (field: 'owner' | 'winner' | 'settlerAddress'): SelectOption[] =>
      deriveAddressOptions(allNouns, field).map((e) => ({
        value: e.address,
        label: `${getEnsFromMap(ensMap, e.address).name ?? truncateAddr(e.address)} (${e.count})`,
      }));
    return {
      owner: toOptions('owner'),
      winner: toOptions('winner'),
      settler: toOptions('settlerAddress'),
    };
  }, [allNouns, ensMap]);

  const setFilter = (key: keyof V2ProbeFilters, value: string, numeric: boolean) => {
    onFiltersChange({
      ...filters,
      [key]: value === '' ? null : numeric ? parseInt(value, 10) : value,
    });
  };

  const handleSortToggle = (sorts: [V2ProbeSort, V2ProbeSort]) => {
    onSortChange(sort === sorts[0] ? sorts[1] : sorts[0]);
  };

  return (
    <div className={styles.bar}>
      <div className={styles.sortRow}>
        <div className={styles.sortButtons}>
          <button
            type="button"
            className={`${styles.sortButton} ${isDefault ? styles.active : ''}`}
            onClick={onReset}
          >
            RESET
          </button>
          {SORT_TOGGLES.map(({ sorts, labels }) => {
            const isActive = sort === sorts[0] || sort === sorts[1];
            const label = sort === sorts[0] ? labels[1] : labels[0];
            return (
              <button
                key={sorts[0]}
                type="button"
                className={`${styles.sortButton} ${isActive ? styles.active : ''}`}
                onClick={() => handleSortToggle(sorts)}
              >
                {label}
              </button>
            );
          })}
        </div>
        <span className={styles.count}>{total.toLocaleString()} nouns</span>
      </div>

      <div className={styles.filtersGrid}>
        {TRAIT_FILTERS.map(({ key, type, label }) => {
          const options: SelectOption[] = deriveTraitOptions(allNouns, type).map((o) => ({
            value: String(o.value),
            label: `${getV2TraitLabel(type, o.value)} (${o.count})`,
          }));
          const value = filters[key];
          return (
            <Select
              key={key}
              options={options}
              value={value != null ? String(value) : ''}
              onChange={(v) => setFilter(key, v, true)}
              allowNone
              noneLabel={`Any ${label}`}
              placeholder={`Any ${label}`}
            />
          );
        })}

        <Select
          options={addressOptions.owner}
          value={filters.owner ?? ''}
          onChange={(v) => setFilter('owner', v, false)}
          allowNone
          noneLabel="Any Owner"
          placeholder="Any Owner"
        />
        <Select
          options={addressOptions.winner}
          value={filters.winner ?? ''}
          onChange={(v) => setFilter('winner', v, false)}
          allowNone
          noneLabel="Any Winner"
          placeholder="Any Winner"
        />
        <Select
          options={addressOptions.settler}
          value={filters.settler ?? ''}
          onChange={(v) => setFilter('settler', v, false)}
          allowNone
          noneLabel="Any Settler"
          placeholder="Any Settler"
        />
      </div>
    </div>
  );
}
