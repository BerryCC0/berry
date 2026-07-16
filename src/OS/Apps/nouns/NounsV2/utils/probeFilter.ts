/**
 * Client-side filtering, sorting, and option-derivation for the V2 Probe.
 * The V2 collection is small enough that this all runs on the full set.
 */

import type { V2ProbeNoun } from '../hooks/useV2ProbeNouns';
import type { V2TraitType } from './traitLabels';

export interface V2ProbeFilters {
  head?: number | null;
  glasses?: number | null;
  body?: number | null;
  accessory?: number | null;
  background?: number | null;
  owner?: string | null;
  winner?: string | null;
  settler?: string | null;
}

export type V2ProbeSort = 'newest' | 'oldest' | 'largest' | 'smallest';

export const TRAIT_FILTERS: { key: keyof V2ProbeFilters; type: V2TraitType; label: string }[] = [
  { key: 'head', type: 'head', label: 'Head' },
  { key: 'glasses', type: 'glasses', label: 'Glasses' },
  { key: 'body', type: 'body', label: 'Body' },
  { key: 'accessory', type: 'accessory', label: 'Accessory' },
  { key: 'background', type: 'background', label: 'Background' },
];

const TRAIT_KEYS = ['head', 'glasses', 'body', 'accessory', 'background'] as const;
const ADDRESS_FIELDS: { filterKey: 'owner' | 'winner' | 'settler'; nounKey: keyof V2ProbeNoun }[] = [
  { filterKey: 'owner', nounKey: 'owner' },
  { filterKey: 'winner', nounKey: 'winner' },
  { filterKey: 'settler', nounKey: 'settlerAddress' },
];

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function hasActiveFilters(filters: V2ProbeFilters): boolean {
  return Object.values(filters).some((v) => v != null && v !== '');
}

export function filterAndSortNouns(
  nouns: V2ProbeNoun[],
  filters: V2ProbeFilters,
  sort: V2ProbeSort
): V2ProbeNoun[] {
  const filtered = nouns.filter((n) => {
    for (const key of TRAIT_KEYS) {
      const want = filters[key];
      if (want != null && n[key] !== want) return false;
    }
    for (const { filterKey, nounKey } of ADDRESS_FIELDS) {
      const want = filters[filterKey];
      if (want) {
        const have = n[nounKey];
        if (typeof have !== 'string' || have.toLowerCase() !== want.toLowerCase()) return false;
      }
    }
    return true;
  });

  const byBid = (n: V2ProbeNoun) => (n.amount != null ? BigInt(n.amount) : null);

  return filtered.sort((a, b) => {
    switch (sort) {
      case 'oldest':
        return a.id - b.id;
      case 'largest':
      case 'smallest': {
        const av = byBid(a);
        const bv = byBid(b);
        // Nulls (no winning bid) always sort last.
        if (av == null && bv == null) return b.id - a.id;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av === bv) return b.id - a.id;
        const cmp = av > bv ? 1 : -1;
        return sort === 'largest' ? -cmp : cmp;
      }
      case 'newest':
      default:
        return b.id - a.id;
    }
  });
}

/** Distinct trait values present in the set, with counts, most-common first. */
export function deriveTraitOptions(
  nouns: V2ProbeNoun[],
  type: V2TraitType
): { value: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const n of nouns) {
    const v = n[type];
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value - b.value);
}

/** Distinct non-zero addresses for an owner/winner/settler field, with counts. */
export function deriveAddressOptions(
  nouns: V2ProbeNoun[],
  field: 'owner' | 'winner' | 'settlerAddress'
): { address: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const n of nouns) {
    const addr = n[field];
    if (typeof addr === 'string' && addr && addr !== ZERO_ADDRESS) {
      const key = addr.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([address, count]) => ({ address, count }))
    .sort((a, b) => b.count - a.count || a.address.localeCompare(b.address));
}

/** All distinct addresses across owner/winner/settler — for one ENS batch. */
export function allProbeAddresses(nouns: V2ProbeNoun[]): string[] {
  const set = new Set<string>();
  for (const n of nouns) {
    for (const addr of [n.owner, n.winner, n.settlerAddress]) {
      if (typeof addr === 'string' && addr && addr !== ZERO_ADDRESS) set.add(addr.toLowerCase());
    }
  }
  return [...set];
}
