/**
 * Food Nouns — single-window app for the V1 fork.
 * Tabs: Auction · Treasury · Governance · Voters.
 */

'use client';

import { useState } from 'react';
import type { AppComponentProps } from '@/OS/types/app';
import { AuctionView } from './views/AuctionView';
import { GovernanceView } from './views/GovernanceView';
import { TreasuryView } from './views/TreasuryView';
import { VotersView } from './views/VotersView';
import styles from './FoodNouns.module.css';

type TabId = 'auction' | 'governance' | 'treasury' | 'voters';

const TABS: { id: TabId; label: string }[] = [
  { id: 'auction', label: 'Auction' },
  { id: 'treasury', label: 'Treasury' },
  { id: 'governance', label: 'Governance' },
  { id: 'voters', label: 'Voters' },
];

interface InitialState {
  tab?: TabId;
}

function isInitialState(state: unknown): state is InitialState {
  if (!state || typeof state !== 'object') return false;
  const s = state as Record<string, unknown>;
  return s.tab === undefined || typeof s.tab === 'string';
}

export function FoodNouns({ initialState, onStateChange }: AppComponentProps) {
  const startTab: TabId =
    (isInitialState(initialState) && (initialState.tab as TabId)) || 'auction';

  const [tab, setTab] = useState<TabId>(startTab);

  const handleTabChange = (next: TabId) => {
    setTab(next);
    onStateChange?.({ tab: next });
  };

  return (
    <div className={styles.app}>
      <nav className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => handleTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className={styles.content}>
        {tab === 'auction' && <AuctionView />}
        {tab === 'governance' && <GovernanceView />}
        {tab === 'treasury' && <TreasuryView />}
        {tab === 'voters' && <VotersView />}
      </div>
    </div>
  );
}

export default FoodNouns;
