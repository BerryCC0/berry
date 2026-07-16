/**
 * V2 traits list. V2 has no static trait-name registry (names live on-chain in
 * the descriptor), so labels are index-based via getV2TraitLabel, with the few
 * named indices we care about for the slobber narrative. A Slobber badge shows
 * when the seed was overridden by the hidden seeder rule.
 */

'use client';

import { getV2TraitLabel } from '../utils/traitLabels';
import styles from './V2TraitsList.module.css';

export interface V2Seed {
  background: number;
  body: number;
  accessory: number;
  head: number;
  glasses: number;
}

interface Props {
  seed: V2Seed | null;
  isSlobber?: boolean;
  loading?: boolean;
}

const ROWS: { key: keyof V2Seed; type: Parameters<typeof getV2TraitLabel>[0]; label: string }[] = [
  { key: 'head', type: 'head', label: 'Head' },
  { key: 'glasses', type: 'glasses', label: 'Glasses' },
  { key: 'body', type: 'body', label: 'Body' },
  { key: 'accessory', type: 'accessory', label: 'Accessory' },
  { key: 'background', type: 'background', label: 'Background' },
];

export function V2TraitsList({ seed, isSlobber = false, loading = false }: Props) {
  return (
    <div className={styles.traits}>
      {isSlobber && seed && <span className={styles.slobberBadge}>Slobber</span>}
      {ROWS.map(({ key, type, label }) => (
        <div key={key} className={styles.row}>
          <span className={styles.label}>{label}</span>
          <span className={styles.value}>
            {loading || !seed ? '…' : getV2TraitLabel(type, seed[key])}
          </span>
        </div>
      ))}
    </div>
  );
}
