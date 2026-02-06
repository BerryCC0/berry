/**
 * FilterBar Component
 * Trait filter dropdowns and sort controls for Probe
 * Styled to match probe.wtf — Comic Sans Bold, thick borders, 2-row grid
 * All 8 filters are ProbeSelect dropdowns including OWNER and SETTLER
 */

'use client';

import { useCallback, useMemo } from 'react';
import type { SelectOption } from '@/OS/components/Primitives/Select';
import type { TraitType } from '@/app/lib/nouns/utils/trait-name-utils';
import type { ProbeFilters, ProbeSort } from '../hooks/useProbeNouns';
import type { TraitOptions, TraitOption } from '../hooks/useTraitOptions';
import { getTraitImageUrl } from '../utils/traitImages';
import { getPaletteColorOptions } from '../utils/paletteColors';
import { ProbeSelect } from './ProbeSelect';
import styles from './FilterBar.module.css';

interface FilterBarProps {
  filters: ProbeFilters;
  sort: ProbeSort;
  traitOptions: TraitOptions;
  total: number;
  colorIndex: number | null;
  ownerOptions: SelectOption[];
  settlerOptions: SelectOption[];
  onColorChange: (index: number | null) => void;
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

/**
 * Generate a tiny solid-color SVG data URL for a palette swatch icon
 */
function colorSwatchIcon(hex: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#${hex}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function FilterBar({
  filters,
  sort,
  traitOptions,
  total,
  colorIndex,
  ownerOptions,
  settlerOptions,
  onColorChange,
  onFiltersChange,
  onSortChange,
  onReset,
}: FilterBarProps) {
  const hasFilters =
    colorIndex != null ||
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

  // Palette color options for the COLOR filter
  const paletteColorOptions = useMemo((): SelectOption[] => {
    return getPaletteColorOptions().map((c) => ({
      value: String(c.index),
      label: `#${c.hex.toUpperCase()}`,
      icon: colorSwatchIcon(c.hex),
    }));
  }, []);

  const updateFilter = useCallback(
    (key: keyof ProbeFilters, value: string) => {
      const numericKeys = ['background', 'body', 'accessory', 'head', 'glasses'] as const;
      if ((numericKeys as readonly string[]).includes(key)) {
        onFiltersChange({
          ...filters,
          [key]: value === '' ? null : parseInt(value),
        });
      } else {
        // For address filters (settler, winner): value is already lowercase address
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
      {/* Sort options */}
      <div className={styles.sortRow}>
        <button
          className={`${styles.sortButton} ${!hasFilters && sort === 'newest' ? styles.active : ''}`}
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

      {/* Filters: 2 rows x 4 columns */}
      <div className={styles.filtersGrid}>
        {/* Row 1 */}
        <ProbeSelect
          label="COLOR"
          options={paletteColorOptions}
          value={colorIndex != null ? String(colorIndex) : ''}
          onChange={(v) => onColorChange(v === '' ? null : parseInt(v))}
        />
        <ProbeSelect
          label="ACCESSORY"
          options={accessoryOptions}
          value={filters.accessory != null ? String(filters.accessory) : ''}
          onChange={(v) => updateFilter('accessory', v)}
        />
        <ProbeSelect
          label="BODY"
          options={bodyOptions}
          value={filters.body != null ? String(filters.body) : ''}
          onChange={(v) => updateFilter('body', v)}
        />
        <ProbeSelect
          label="GLASSES"
          options={glassesOptions}
          value={filters.glasses != null ? String(filters.glasses) : ''}
          onChange={(v) => updateFilter('glasses', v)}
        />

        {/* Row 2 */}
        <ProbeSelect
          label="HEAD"
          options={headOptions}
          value={filters.head != null ? String(filters.head) : ''}
          onChange={(v) => updateFilter('head', v)}
        />
        <ProbeSelect
          label="BACKGROUND"
          options={backgroundOptions}
          value={filters.background != null ? String(filters.background) : ''}
          onChange={(v) => updateFilter('background', v)}
        />
        <ProbeSelect
          label="OWNER"
          options={ownerOptions}
          value={filters.winner || ''}
          onChange={(v) => updateFilter('winner', v)}
        />
        <ProbeSelect
          label="SETTLER"
          options={settlerOptions}
          value={filters.settler || ''}
          onChange={(v) => updateFilter('settler', v)}
        />
      </div>
    </div>
  );
}
