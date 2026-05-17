/**
 * Treasury Dashboard App
 *
 * Tabbed accounting view backed by both on-chain reads (Balances) and
 * Ponder-indexed activity (Spends, Streams, Token Buyer, Client Rewards).
 */

'use client';

import { useState } from 'react';
import type { AppComponentProps } from '@/OS/types/app';
import {
  BalancesTab,
  SpendsTab,
  StreamsTab,
  TokenBuyerTab,
  ClientRewardsTab,
} from './tabs';
import styles from './Treasury.module.css';

type TabId = 'balances' | 'spends' | 'streams' | 'tokenBuyer' | 'clientRewards';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'balances', label: 'Balances' },
  { id: 'spends', label: 'Spends' },
  { id: 'streams', label: 'Streams' },
  { id: 'tokenBuyer', label: 'Token Buyer' },
  { id: 'clientRewards', label: 'Client Rewards' },
];

export function Treasury({}: AppComponentProps) {
  const [activeTab, setActiveTab] = useState<TabId>('balances');

  return (
    <div className={styles.treasury}>
      <div className={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.tabPanel}>
        {activeTab === 'balances' && <BalancesTab />}
        {activeTab === 'spends' && <SpendsTab />}
        {activeTab === 'streams' && <StreamsTab />}
        {activeTab === 'tokenBuyer' && <TokenBuyerTab />}
        {activeTab === 'clientRewards' && <ClientRewardsTab />}
      </div>
    </div>
  );
}

export default Treasury;
