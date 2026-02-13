/**
 * Clients Incentives Dashboard
 * Thin orchestrator — all business logic lives in hooks/, all presentation in components/.
 *
 * Routes:
 * - /clients                    → Dashboard (default tab)
 * - /clients/auctions           → Dashboard auctions tab
 * - /clients/proposals          → Dashboard proposals tab
 * - /clients/leaderboard        → Dashboard leaderboard tab
 * - /clients/{id}               → Client detail by ID
 * - /clients/{name-slug}        → Client detail by name
 * - /clients/{id}/{tab}         → Client detail with specific tab
 * - /clients/{name-slug}/{tab}  → Client detail with specific tab
 */

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
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
import {
  parseClientsRoute,
  clientsRouteToPath,
  type ClientsRoute,
  type DashboardTab,
  type ClientTab,
} from './types';
import styles from './Clients.module.css';

interface ClientsInitialState {
  path?: string;
}

export function Clients({ windowId, initialState, onStateChange }: AppComponentProps) {
  // All data orchestration
  const {
    clients, clientsLoading, rewardUpdates,
    contractWethBalanceEth, quorumBps, pendingRevenueEth, incentiveQuorum,
    clientMetadata, cycleAuctionsData, cycleRewardsByClient,
    cycleProgress,
    totals, getSortedClients, rewardEconData, revenueData,
    votesByClient, proposalsByClient, currentPeriodProposals,
    getEligibility, eligibleCount, proposalBreakdowns,
  } = useDashboardData();

  // Client NFT ownership detection
  const { ownedClientId, clientBalance: ownedClientBalance } = useOwnedClient(clients);

  // Cast initialState
  const clientsState = initialState as ClientsInitialState | undefined;

  // Route-based navigation (following Camp's pattern)
  const [route, setRoute] = useState<ClientsRoute>(() =>
    parseClientsRoute(clientsState?.path, clients ?? undefined),
  );
  const [history, setHistory] = useState<ClientsRoute[]>([]);

  // Re-parse route when initialState changes (deep link from external)
  useEffect(() => {
    if (clientsState?.path !== undefined) {
      const newRoute = parseClientsRoute(clientsState.path, clients ?? undefined);
      setRoute(newRoute);
    }
  }, [clientsState?.path]);

  // Re-resolve slug-based routes once clients data loads
  // (initial parse may not have had the client list)
  useEffect(() => {
    if (clients && clientsState?.path) {
      const resolved = parseClientsRoute(clientsState.path, clients);
      setRoute((prev) => {
        // Only update if the resolution actually changed something
        if (prev.view === 'dashboard' && resolved.view === 'client') return resolved;
        return prev;
      });
    }
  }, [clients, clientsState?.path]);

  // Navigate to a new route
  const navigate = useCallback((newRoute: ClientsRoute) => {
    setHistory((prev) => [...prev, route]);
    setRoute(newRoute);

    const newPath = clientsRouteToPath(newRoute, clients ?? undefined);
    onStateChange?.({ path: newPath });
  }, [route, onStateChange, clients]);

  // Go back in history
  const goBack = useCallback(() => {
    if (history.length > 0) {
      const prevRoute = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setRoute(prevRoute);
      onStateChange?.({ path: clientsRouteToPath(prevRoute, clients ?? undefined) });
    } else {
      setRoute({ view: 'dashboard' });
      onStateChange?.({ path: '' });
    }
  }, [history, onStateChange, clients]);

  // Convenience navigation helpers
  const navigateToClient = useCallback((clientId: number, tab?: ClientTab) => {
    navigate({ view: 'client', clientId, tab });
  }, [navigate]);

  const navigateToDashboardTab = useCallback((tab: DashboardTab) => {
    navigate({ view: 'dashboard', tab });
  }, [navigate]);

  const handleClientTabChange = useCallback((tab: ClientTab) => {
    if (route.view === 'client') {
      const newRoute: ClientsRoute = { view: 'client', clientId: route.clientId, tab };
      setRoute(newRoute);
      const newPath = clientsRouteToPath(newRoute, clients ?? undefined);
      onStateChange?.({ path: newPath });
    }
  }, [route, onStateChange, clients]);

  // UI state not tied to URL
  const [sortField, setSortField] = useState<string>('totalRewarded');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterEligible, setFilterEligible] = useState(true);
  const [chartsOpen, setChartsOpen] = useState(false);

  // Derive bottomTab from route
  const bottomTab: DashboardTab = route.view === 'dashboard' ? (route.tab ?? 'auctions') : 'auctions';

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
  if (route.view === 'client') {
    const client = clients?.find((c) => c.clientId === route.clientId);
    if (client) {
      return (
        <ClientDetail
          client={client}
          rewardUpdates={rewardUpdates ?? []}
          onBack={goBack}
          isOwner={ownedClientId === route.clientId}
          clientMetadata={clientMetadata}
          activeTab={route.tab}
          onTabChange={handleClientTabChange}
          incentiveQuorum={incentiveQuorum}
        />
      );
    }
    // Client not found (data still loading or invalid ID) — fall through to loading/dashboard
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
            onClick={() => navigateToClient(ownedClientId)}
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
            onClick={() => navigateToDashboardTab('auctions')}
          >
            Current Cycle Auctions
          </button>
          <button
            className={`${styles.bottomTab} ${bottomTab === 'proposals' ? styles.bottomTabActive : ''}`}
            onClick={() => navigateToDashboardTab('proposals')}
          >
            Current Cycle Proposals
          </button>
          <button
            className={`${styles.bottomTab} ${bottomTab === 'leaderboard' ? styles.bottomTabActive : ''}`}
            onClick={() => navigateToDashboardTab('leaderboard')}
          >
            Leaderboard
          </button>
        </div>

        {/* Keep all tabs mounted; hide inactive ones to avoid unmount/remount cycles */}
        <div style={{ display: bottomTab === 'auctions' ? undefined : 'none' }}>
          <AuctionsTab
            cycleAuctionsData={cycleAuctionsData}
            clientMetadata={clientMetadata}
            clients={clients}
            pendingRevenueEth={pendingRevenueEth}
          />
        </div>

        <div style={{ display: bottomTab === 'proposals' ? undefined : 'none' }}>
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
        </div>

        <div style={{ display: bottomTab === 'leaderboard' ? undefined : 'none' }}>
          <LeaderboardTab
            sortedClients={sortedClients}
            clientMetadata={clientMetadata}
            clients={clients}
            sortField={sortField}
            sortDir={sortDir}
            handleSort={handleSort}
            onSelectClient={navigateToClient}
          />
        </div>
      </div>
    </div>
  );
}

export default Clients;
