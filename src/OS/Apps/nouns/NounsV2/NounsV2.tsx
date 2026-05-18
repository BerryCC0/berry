/**
 * Nouns V2 — single-window app for the standalone V2 DAO + Small Grants pot.
 * Tabs: Auction · Crystal Ball · Governance · Treasury · Holdings · Small Grants.
 */

'use client';

import { useState } from 'react';
import type { AppComponentProps } from '@/OS/types/app';
import { AuctionView } from './views/AuctionView';
import { CrystalBallView } from './views/CrystalBallView';
import { GovernanceView } from './views/GovernanceView';
import { TreasuryView } from './views/TreasuryView';
import { HoldingsView } from './views/HoldingsView';
import { SmallGrantsView } from './views/SmallGrantsView';
import styles from './NounsV2.module.css';

type TabId =
  | 'auction'
  | 'crystal-ball'
  | 'governance'
  | 'treasury'
  | 'holdings'
  | 'small-grants';

const TABS: { id: TabId; label: string }[] = [
  { id: 'auction', label: 'Auction' },
  { id: 'crystal-ball', label: 'Crystal Ball' },
  { id: 'governance', label: 'Governance' },
  { id: 'treasury', label: 'Treasury' },
  { id: 'holdings', label: 'Holdings' },
  { id: 'small-grants', label: 'Small Grants' },
];

interface InitialState {
  tab?: TabId;
}

function isInitialState(state: unknown): state is InitialState {
  if (!state || typeof state !== 'object') return false;
  const s = state as Record<string, unknown>;
  return s.tab === undefined || typeof s.tab === 'string';
}

export function NounsV2({ initialState, onStateChange }: AppComponentProps) {
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
        {tab === 'crystal-ball' && <CrystalBallView />}
        {tab === 'governance' && <GovernanceView />}
        {tab === 'treasury' && <TreasuryView />}
        {tab === 'holdings' && <HoldingsView />}
        {tab === 'small-grants' && <SmallGrantsView />}
      </div>
    </div>
  );
}

export default NounsV2;
