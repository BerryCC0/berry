/**
 * Clients Incentives Dashboard
 * Thin orchestrator — all business logic lives in hooks/, all presentation in components/.
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import type { AppComponentProps } from '@/OS/types/app';
import { useDashboardData } from './hooks/useDashboardData';
import { useOwnedClient } from './hooks/useOwnedClient';
import { ClientDetail } from './components/ClientDetail';
import { InfoCard } from './components/InfoCard';
import { RevenueChart } from './components/RevenueChart';
import { RewardRateCharts } from './components/RewardRateCharts';
import { ProposalsTab } from './components/ProposalsTab';
import { AuctionsTab } from './components/AuctionsTab';
import { LeaderboardTab } from './components/LeaderboardTab';
import styles from './Clients.module.css';

export function Clients({ windowId }: AppComponentProps) {
  // All data orchestration
  const {
    clients, clientsLoading, rewardUpdates,
    contractWethBalanceEth, quorumBps, pendingRevenueEth,
    clientMetadata, cycleAuctionsData, cycleRewardsByClient,
    cycleProgress,
    totals, getSortedClients, rewardEconData, revenueData,
    votesByClient, proposalsByClient, currentPeriodProposals,
    getEligibility, eligibleCount, proposalBreakdowns,
  } = useDashboardData();

  // Client NFT ownership detection
  const { ownedClientId, clientBalance: ownedClientBalance } = useOwnedClient(clients);

  // UI state
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [sortField, setSortField] = useState<string>('totalRewarded');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [bottomTab, setBottomTab] = useState<'proposals' | 'auctions' | 'leaderboard'>('proposals');
  const [filterEligible, setFilterEligible] = useState(true);
  const [chartsOpen, setChartsOpen] = useState(false);

  const sortedClients = useMemo(
    () => getSortedClients(sortField, sortDir),
    [getSortedClients, sortField, sortDir],
  );

  const handleSort = useCallback((field: string) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
        return prev;
      }
      setSortDir('desc');
      return field;
    });
  }, []);

  // ---------- Detail view ----------
  if (selectedClientId !== null) {
    const client = clients?.find((c) => c.clientId === selectedClientId);
    if (client) {
      return (
        <ClientDetail
          client={client}
          rewardUpdates={rewardUpdates ?? []}
          onBack={() => setSelectedClientId(null)}
          isOwner={ownedClientId === selectedClientId}
        />
      );
    }
  }

  // ---------- Loading ----------
  if (clientsLoading) {
    return (
      <div className={styles.clients}>
        <div className={styles.loading}>
          <img src="/icons/loader.gif" alt="Loading" className={styles.loaderGif} />
        </div>
      </div>
    );
  }

  if (!clients?.length) {
    return (
      <div className={styles.clients}>
        <div className={styles.emptyState}>
          <div className={styles.emptyText}>No client incentives data available</div>
        </div>
      </div>
    );
  }

  // ---------- Dashboard ----------
  return (
    <div className={styles.clients}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.toolbarTitle}>Client Incentives</span>
        {ownedClientId != null && (
          <button
            className={styles.toolbarClientButton}
            onClick={() => setSelectedClientId(ownedClientId)}
          >
            {clients?.find((c) => c.clientId === ownedClientId)?.name || 'My Client'}
          </button>
        )}
      </div>

      <div className={styles.content}>
        {/* Collapsible charts section */}
        <button
          className={styles.collapseToggle}
          onClick={() => setChartsOpen((v) => !v)}
        >
          <span className={`${styles.collapseArrow} ${chartsOpen ? styles.collapseArrowOpen : ''}`}>&#9654;</span>
          Overview &amp; Historical Charts
        </button>
        {chartsOpen && (
          <div className={styles.collapseContent}>
            {/* Info card + Auction Revenue chart */}
            <div className={styles.chartsRow}>
              <InfoCard
                totals={totals}
                contractWethBalanceEth={contractWethBalanceEth}
                quorumBps={quorumBps}
                rewardEconData={rewardEconData}
              />
              <RevenueChart revenueData={revenueData} />
            </div>

            {/* Reward rate charts */}
            <RewardRateCharts rewardEconData={rewardEconData} />
          </div>
        )}

        {/* Tabbed section */}
        <div className={styles.bottomTabs}>
        <button
            className={`${styles.bottomTab} ${bottomTab === 'auctions' ? styles.bottomTabActive : ''}`}
            onClick={() => setBottomTab('auctions')}
          >
            Current Cycle Auctions
          </button>
          <button
            className={`${styles.bottomTab} ${bottomTab === 'proposals' ? styles.bottomTabActive : ''}`}
            onClick={() => setBottomTab('proposals')}
          >
            Current Cycle Proposals
          </button>
          <button
            className={`${styles.bottomTab} ${bottomTab === 'leaderboard' ? styles.bottomTabActive : ''}`}
            onClick={() => setBottomTab('leaderboard')}
          >
            Leaderboard
          </button>
        </div>

        {bottomTab === 'auctions' && (
          <AuctionsTab
            cycleAuctionsData={cycleAuctionsData}
            clientMetadata={clientMetadata}
            clients={clients}
            pendingRevenueEth={pendingRevenueEth}
          />
        )}

        {bottomTab === 'proposals' && (
          <ProposalsTab
            proposalsByClient={proposalsByClient}
            votesByClient={votesByClient}
            cycleRewardsByClient={cycleRewardsByClient}
            clientMetadata={clientMetadata}
            clients={clients}
            pendingRevenueEth={pendingRevenueEth}
            eligibleCount={eligibleCount}
            cycleProgress={cycleProgress}
            filterEligible={filterEligible}
            setFilterEligible={setFilterEligible}
            currentPeriodProposals={currentPeriodProposals}
            getEligibility={getEligibility}
            proposalBreakdowns={proposalBreakdowns}
          />
        )}

        {bottomTab === 'leaderboard' && (
          <LeaderboardTab
            sortedClients={sortedClients}
            clientMetadata={clientMetadata}
            clients={clients}
            sortField={sortField}
            sortDir={sortDir}
            handleSort={handleSort}
            onSelectClient={setSelectedClientId}
          />
        )}
      </div>
    </div>
  );
}

export default Clients;
