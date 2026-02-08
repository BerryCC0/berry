/**
 * Clients Incentives Dashboard
 * Presentation component — all business logic lives in hooks/, utils/, and constants.
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line,
} from 'recharts';
import { formatEther } from 'viem';
import type { AppComponentProps } from '@/OS/types/app';
import { useClients, useRewardUpdates, useCycleVotes } from './hooks/useClientIncentives';
import { useContractState } from './hooks/useContractState';
import { useChartData } from './hooks/useChartData';
import { useProposals } from '@/OS/Apps/Camp/hooks';
import { getClientName } from '@/OS/lib/clientNames';
import { CHART_COLORS } from './constants';
import { weiToEth, formatEth, getInitials } from './utils';
import { EthTooltip, RevenueTooltip } from './components/ChartTooltips';
import { ClientDetail } from './components/ClientDetail';
import styles from './Clients.module.css';

export function Clients({ windowId }: AppComponentProps) {
  // Data fetching
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: rewardUpdates } = useRewardUpdates('PROPOSAL');
  const { data: proposals } = useProposals(50, 'all', 'newest');

  // On-chain contract state
  const {
    contractWethBalance,
    proposalRewardParams,
    nextProposalIdToReward,
    pendingRevenue,
  } = useContractState();

  // Compute eligible proposal IDs for current cycle vote fetching
  const eligibleProposalIds = useMemo(() => {
    if (!proposals?.length || nextProposalIdToReward == null) return [];
    const cutoff = Number(nextProposalIdToReward) - 1;
    return proposals
      .filter((p) => {
        if (Number(p.id) <= cutoff) return false; // already rewarded
        if (p.clientId == null) return false;
        if (['CANCELLED', 'VETOED'].includes(p.status)) return false;
        const forVotes = Number(p.forVotes);
        const quorum = Number(p.quorumVotes) || 1;
        return forVotes >= quorum;
      })
      .map((p) => Number(p.id));
  }, [proposals, nextProposalIdToReward]);

  // Fetch vote weight per client for current cycle eligible proposals
  const { data: cycleVotes } = useCycleVotes(eligibleProposalIds);

  // Computed chart & table data
  const {
    totals,
    getSortedClients,
    rewardEconData,
    revenueData,
    votesByClient,
    proposalsByClient,
    currentPeriodProposals,
    getEligibility,
    eligibleCount,
  } = useChartData(clients, rewardUpdates, proposals, nextProposalIdToReward, cycleVotes);

  // UI state
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [sortField, setSortField] = useState<string>('totalRewarded');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [bottomTab, setBottomTab] = useState<'proposals' | 'leaderboard'>('proposals');
  const [filterEligible, setFilterEligible] = useState(false);

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

  const sortArrow = (field: string) =>
    sortField === field ? (sortDir === 'desc' ? ' \u25BE' : ' \u25B4') : '';

  // ---------- Detail view ----------
  if (selectedClientId !== null) {
    const client = clients?.find((c) => c.clientId === selectedClientId);
    if (client) {
      return (
        <ClientDetail
          client={client}
          rewardUpdates={rewardUpdates ?? []}
          onBack={() => setSelectedClientId(null)}
        />
      );
    }
  }

  // ---------- Loading ----------
  if (clientsLoading) {
    return (
      <div className={styles.clients}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span className={styles.loadingText}>Loading client incentives...</span>
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
        <span className={styles.toolbarBadge}>{totals.count} clients</span>
      </div>

      <div className={styles.content}>
        {/* Info card + Auction Revenue chart */}
        <div className={styles.chartsRow}>
          <div className={styles.infoCard}>
            <div className={styles.infoTitle}>Client Incentives Contract</div>
            <div className={styles.infoDescription}>
              Nouns DAO rewards third-party clients that facilitate governance participation and auction bidding.
            </div>
            <div className={styles.infoStats}>
            <div className={styles.infoStatRow}>
                <span className={styles.infoStatLabel}>Registered Clients</span>
                <span className={styles.infoStatValue}>{totals.count}</span>
              </div>
              <div className={styles.infoStatRow}>
                <span className={styles.infoStatLabel}>Current Balance</span>
                <span className={styles.infoStatValue}>
                  {contractWethBalance != null
                    ? `${formatEth(Number(formatEther(contractWethBalance as bigint)))} ETH`
                    : '—'}
                </span>
              </div>
              <div className={styles.infoStatRow}>
                <span className={styles.infoStatLabel}>Total Rewarded</span>
                <span className={styles.infoStatValue}>{formatEth(totals.rewarded)} ETH</span>
              </div>
              <div className={styles.infoStatRow}>
                <span className={styles.infoStatLabel}>Total Withdrawn</span>
                <span className={styles.infoStatValue}>{formatEth(totals.withdrawn)} ETH</span>
              </div>
              <div className={styles.infoStatRow}>
                <span className={styles.infoStatLabel}>Pending Withdraw or Approval</span>
                <span className={styles.infoStatValue}>{formatEth(totals.balance)} ETH</span>
              </div>
              <div className={styles.infoDivider} />
              <div className={styles.infoStatRow}>
                <span className={styles.infoStatLabel}>Auction Bid Reward</span>
                <span className={styles.infoStatValue}>5% of winning bid</span>
              </div>
              <div className={styles.infoStatRow}>
                <span className={styles.infoStatLabel}>Proposal Eligibility Quorum</span>
                <span className={styles.infoStatValue}>
                  {proposalRewardParams
                    ? `${Number(proposalRewardParams.proposalEligibilityQuorumBps) / 100}%`
                    : '10%'}
                </span>
              </div>
              <div className={styles.infoStatRow}>
                <span className={styles.infoStatLabel}>Previous Reward per Proposal</span>
                <span className={styles.infoStatValue}>
                  {rewardEconData.length > 0
                    ? `${formatEth(rewardEconData[rewardEconData.length - 1].rewardPerProposal)} ETH`
                    : '—'}
                </span>
              </div>
              <div className={styles.infoStatRow}>
                <span className={styles.infoStatLabel}>Previous Reward per Vote</span>
                <span className={styles.infoStatValue}>
                  {rewardEconData.length > 0
                    ? `${formatEth(rewardEconData[rewardEconData.length - 1].rewardPerVote)} ETH`
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          {revenueData.length > 0 && (
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>Auction Revenue per Update</div>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e5e5e5)" />
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" angle={-30} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} width={50} />
                    <Tooltip content={<RevenueTooltip />} />
                    <Bar dataKey="revenue" name="Auction Revenue" fill="#ff9500" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Reward rate charts: per proposal, per vote, per winning auction */}
        {rewardEconData.length > 0 && (
          <div className={styles.chartsRowTriple}>

          <div className={styles.chartCard}>
              <div className={styles.chartTitle}>Reward per Winning Auction</div>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rewardEconData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e5e5e5)" />
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" angle={-30} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} width={50} />
                    <Tooltip content={<EthTooltip />} />
                    <Line type="monotone" dataKey="rewardPerAuction" name="Per Auction"
                      stroke="#ff9500" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>Reward per Proposal</div>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rewardEconData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e5e5e5)" />
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" angle={-30} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} width={50} />
                    <Tooltip content={<EthTooltip />} />
                    <Line type="monotone" dataKey="rewardPerProposal" name="Per Proposal"
                      stroke="#5B8DEF" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>Reward per Vote</div>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rewardEconData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e5e5e5)" />
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" angle={-30} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} width={50} />
                    <Tooltip content={<EthTooltip />} />
                    <Line type="monotone" dataKey="rewardPerVote" name="Per Vote"
                      stroke="#34c759" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Tabbed section */}
        <div className={styles.bottomTabs}>
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

        {bottomTab === 'proposals' && (
          <>
            {/* Votes by Client distribution */}
            {votesByClient.length > 0 && (
              <div className={styles.distributionSection}>
                <div className={styles.distributionLabel}>Votes by Client</div>
                <div className={styles.distributionBar}>
                  {votesByClient.map((c) => (
                    <div
                      key={c.clientId}
                      className={styles.distributionSegment}
                      style={{ width: `${c.pct}%`, background: c.color }}
                      title={`${c.name}: ${c.count.toLocaleString()} votes`}
                    />
                  ))}
                </div>
                <div className={styles.distributionLegend}>
                  {votesByClient.map((c) => (
                    <span key={c.clientId} className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: c.color }} />
                      {c.name} {c.count.toLocaleString()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Proposals by Client distribution */}
            {proposalsByClient.length > 0 && (
              <div className={styles.distributionSection}>
                <div className={styles.distributionLabel}>Proposals by Client</div>
                <div className={styles.distributionBar}>
                  {proposalsByClient.map((c) => (
                    <div
                      key={c.clientId}
                      className={styles.distributionSegment}
                      style={{ width: `${c.pct}%`, background: c.color }}
                      title={`${c.name}: ${c.count} proposals`}
                    />
                  ))}
                </div>
                <div className={styles.distributionLegend}>
                  {proposalsByClient.map((c) => (
                    <span key={c.clientId} className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: c.color }} />
                      {c.name} {c.count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Pool info */}
            <div className={styles.poolInfo}>
              <span>
                Pool <span className={styles.poolValue}>
                  {pendingRevenue != null
                    ? `${formatEth(weiToEth((pendingRevenue as [bigint, bigint])[0].toString()) * 0.05)} ETH`
                    : '—'}
                </span>
              </span>
              <span>
                Eligible: <span className={styles.poolValue}>
                  {eligibleCount.eligible}/{eligibleCount.withClient}
                </span> of {eligibleCount.total}
              </span>
              <button
                className={`${styles.filterToggle} ${filterEligible ? styles.filterToggleActive : ''}`}
                onClick={() => setFilterEligible((v) => !v)}
              >
                {filterEligible ? 'Show All' : 'Eligible Only'}
              </button>
            </div>

            {/* Current period proposals (unrewarded) */}
            {currentPeriodProposals.filter((p) => {
              if (!filterEligible) return true;
              const e = getEligibility(p);
              return e === 'eligible' || e === 'pending';
            }).map((proposal) => {
              const forVotes = Number(proposal.forVotes);
              const againstVotes = Number(proposal.againstVotes);
              const quorum = Number(proposal.quorumVotes) || 1;
              const totalVotes = forVotes + againstVotes;
              const forPct = totalVotes > 0 ? (forVotes / totalVotes) * 100 : 0;
              const clientName = proposal.clientId != null ? getClientName(proposal.clientId) : null;
              const isActive = ['ACTIVE', 'OBJECTION_PERIOD'].includes(proposal.status);
              const isUpdatable = proposal.status === 'UPDATABLE';
              const isDefeated = proposal.status === 'DEFEATED';
              const isExecuted = proposal.status === 'EXECUTED';
              const isQueued = proposal.status === 'QUEUED';
              const eligibility = getEligibility(proposal);

              const statusClass = isActive ? styles.proposalStatusActive
                : isUpdatable ? styles.proposalStatusUpdatable
                : isDefeated ? styles.proposalStatusDefeated
                : isExecuted ? styles.proposalStatusExecuted
                : isQueued ? styles.proposalStatusQueued
                : '';

              return (
                <div key={proposal.id} className={styles.proposalItem}>
                  {clientName && (
                    <span
                      className={styles.proposalClientBadge}
                      style={{ background: CHART_COLORS[(proposal.clientId ?? 0) % CHART_COLORS.length] + '22', color: CHART_COLORS[(proposal.clientId ?? 0) % CHART_COLORS.length] }}
                    >
                      {clientName}
                    </span>
                  )}
                  <div className={styles.proposalItemHeader}>
                    <span className={styles.proposalNumber}>#{proposal.id}</span>
                  </div>
                  <div className={styles.proposalItemTitle}>{proposal.title}</div>
                  <div className={styles.proposalItemFooter}>
                    {isActive ? (
                      <div className={styles.proposalVoteBar}>
                        <div className={styles.proposalVoteBarTrack}>
                          <div
                            className={styles.proposalVoteBarFill}
                            style={{ width: `${forPct}%`, background: forVotes >= quorum ? '#34c759' : '#5B8DEF' }}
                          />
                        </div>
                        <span className={styles.proposalVoteCount}>{forVotes}/{quorum}</span>
                      </div>
                    ) : (
                      <span className={`${styles.proposalStatusBadge} ${statusClass}`}>
                        {proposal.status}
                      </span>
                    )}
                    {eligibility === 'eligible' ? (
                      <span className={styles.proposalEligible}>Eligible</span>
                    ) : eligibility === 'pending' ? (
                      <span className={styles.proposalPending}>Pending</span>
                    ) : (
                      <span className={styles.proposalIneligible}>Ineligible</span>
                    )}
                  </div>
                </div>
              );
            })}
            {currentPeriodProposals.length === 0 && (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-tertiary, #8e8e93)', fontSize: 13 }}>
                No proposals in current reward period
              </div>
            )}
          </>
        )}

        {bottomTab === 'leaderboard' && (
          <>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Client</th>
                    <th className={`${styles.thRight} ${sortField === 'totalRewarded' ? styles.thActive : ''}`}
                      onClick={() => handleSort('totalRewarded')}>
                      Rewarded{sortArrow('totalRewarded')}
                    </th>
                    <th className={`${styles.thRight} ${sortField === 'balance' ? styles.thActive : ''}`}
                      onClick={() => handleSort('balance')}>
                      Balance{sortArrow('balance')}
                    </th>
                    <th className={`${styles.thRight} ${sortField === 'voteCount' ? styles.thActive : ''}`}
                      onClick={() => handleSort('voteCount')}>
                      Votes{sortArrow('voteCount')}
                    </th>
                    <th className={`${styles.thRight} ${sortField === 'proposalCount' ? styles.thActive : ''}`}
                      onClick={() => handleSort('proposalCount')}>
                      Props{sortArrow('proposalCount')}
                    </th>
                    <th className={`${styles.thRight} ${sortField === 'bidCount' ? styles.thActive : ''}`}
                      onClick={() => handleSort('bidCount')}>
                      Bids{sortArrow('bidCount')}
                    </th>
                    <th className={`${styles.thRight} ${sortField === 'auctionCount' ? styles.thActive : ''}`}
                      onClick={() => handleSort('auctionCount')}>
                      Auctions{sortArrow('auctionCount')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedClients.map((client, idx) => {
                    const balance = weiToEth(client.totalRewarded) - weiToEth(client.totalWithdrawn);
                    const rankClass = idx === 0 ? styles.rankGold
                      : idx === 1 ? styles.rankSilver
                      : idx === 2 ? styles.rankBronze : '';
                    return (
                      <tr key={client.clientId} onClick={() => setSelectedClientId(client.clientId)}>
                        <td><span className={`${styles.rank} ${rankClass}`}>{idx + 1}</span></td>
                        <td>
                          <div className={styles.clientNameCell}>
                            <div className={styles.clientAvatar} style={{ background: CHART_COLORS[client.clientId % CHART_COLORS.length] }}>
                              {getInitials(client.name)}
                            </div>
                            <div>
                              <span className={styles.clientName}>
                                {client.name || `Client ${client.clientId}`}
                                {client.approved && <span className={styles.approvedBadge} />}
                              </span>
                              <div className={styles.clientId}>ID: {client.clientId}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`${styles.tdRight} ${styles.tdMono}`}>{formatEth(weiToEth(client.totalRewarded))}</td>
                        <td className={`${styles.tdRight} ${styles.tdMono}`}>{formatEth(balance)}</td>
                        <td className={styles.tdRight}>{client.voteCount.toLocaleString()}</td>
                        <td className={styles.tdRight}>{client.proposalCount}</td>
                        <td className={styles.tdRight}>{client.bidCount.toLocaleString()}</td>
                        <td className={styles.tdRight}>{client.auctionCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Clients;
