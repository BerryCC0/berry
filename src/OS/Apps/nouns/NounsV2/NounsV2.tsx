/**
 * Nouns V2 — single-window app for the standalone V2 DAO + Small Grants pot.
 * Tabs: Auction · Probe · Governance · Treasury · Holdings · Small Grants.
 * The Auction tab folds in the Crystal Ball (next-noun prediction + settle)
 * once the current auction has ended and needs settling.
 */

'use client';

import { useState } from 'react';
import type { AppComponentProps } from '@/OS/types/app';
import { AuctionView } from './views/AuctionView';
import { ProbeView } from './views/ProbeView';
import { GovernanceView } from './views/GovernanceView';
import { TreasuryView } from './views/TreasuryView';
import { HoldingsView } from './views/HoldingsView';
import { SmallGrantsView } from './views/SmallGrantsView';
import styles from './NounsV2.module.css';

type TabId =
  | 'auction'
  | 'probe'
  | 'governance'
  | 'treasury'
  | 'holdings'
  | 'small-grants';

const TABS: { id: TabId; label: string }[] = [
  { id: 'auction', label: 'Auction' },
  { id: 'probe', label: 'Probe' },
  { id: 'governance', label: 'Governance' },
  { id: 'treasury', label: 'Treasury' },
  { id: 'small-grants', label: 'Small Grants' },
  // Pushed to the right edge (see tabRight) — the connected user's profile,
  // mirroring Camp's Account button.
  { id: 'holdings', label: 'Account' },
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
  // Fall back to Auction if the saved tab no longer exists (e.g. the removed
  // "crystal-ball" tab from an older window state).
  const savedTab = isInitialState(initialState) ? initialState.tab : undefined;
  const startTab: TabId = TABS.some((t) => t.id === savedTab)
    ? (savedTab as TabId)
    : 'auction';

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
            className={`${styles.tab} ${t.id === 'holdings' ? styles.tabRight : ''} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => handleTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className={styles.content}>
        {tab === 'auction' && <AuctionView />}
        {tab === 'probe' && <ProbeView />}
        {tab === 'governance' && <GovernanceView />}
        {tab === 'treasury' && <TreasuryView />}
        {tab === 'holdings' && <HoldingsView />}
        {tab === 'small-grants' && <SmallGrantsView />}
      </div>
    </div>
  );
}

export default NounsV2;
