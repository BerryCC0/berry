/**
 * Clients Incentives Dashboard
 * Visualizes Nouns DAO client incentives data from Ponder
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import type { AppComponentProps } from '@/OS/types/app';
import {
  useClients,
  useClientRewardsTimeSeries,
  useClientActivity,
  useRewardUpdates,
  type ClientData,
  type RewardUpdate,
} from './hooks/useClientIncentives';
import styles from './Clients.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================

const CHART_COLORS = [
  '#5B8DEF', '#34c759', '#ff9500', '#ff3b30', '#af52de',
  '#5ac8fa', '#ffcc00', '#ff2d55', '#64d2ff', '#30d158',
  '#bf5af2', '#ff6482', '#ffd60a', '#0a84ff', '#ac8e68',
];

// ============================================================================
// UTILS
// ============================================================================

/** Format wei to ETH number */
function weiToEth(wei: string): number {
  return Number(BigInt(wei)) / 1e18;
}

/** Format ETH with symbol */
function formatEth(eth: number): string {
  if (eth >= 1000) return `${(eth / 1000).toFixed(1)}k`;
  if (eth >= 100) return eth.toFixed(1);
  if (eth >= 1) return eth.toFixed(2);
  if (eth >= 0.01) return eth.toFixed(3);
  return eth.toFixed(4);
}

/** Get initials from name */
function getInitials(name: string): string {
  if (!name) return '?';
  return name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

/** Format unix timestamp to relative time */
function timeAgo(timestamp: string): string {
  const seconds = Math.floor(Date.now() / 1000 - Number(timestamp));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
}

/** Format unix timestamp to date string */
function formatDate(timestamp: string): string {
  return new Date(Number(timestamp) * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

/** Short date for chart axis */
function shortDate(timestamp: string): string {
  const d = new Date(Number(timestamp) * 1000);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ============================================================================
// CUSTOM TOOLTIPS
// ============================================================================

function EthTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className={styles.tooltipValue}>
          {p.name}: {formatEth(p.value)} ETH
        </div>
      ))}
    </div>
  );
}

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className={styles.tooltipValue}>
          {p.name}: {formatEth(p.value)} ETH
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Clients({ windowId }: AppComponentProps) {
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: rewardUpdates } = useRewardUpdates('PROPOSAL');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [sortField, setSortField] = useState<string>('totalRewarded');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Computed totals
  const totals = useMemo(() => {
    if (!clients?.length) return { rewarded: 0, withdrawn: 0, balance: 0, count: 0, bids: 0 };
    let rewarded = 0, withdrawn = 0, bids = 0;
    for (const c of clients) {
      rewarded += weiToEth(c.totalRewarded);
      withdrawn += weiToEth(c.totalWithdrawn);
      bids += c.bidCount;
    }
    return { rewarded, withdrawn, balance: rewarded - withdrawn, count: clients.length, bids };
  }, [clients]);

  // Sorted clients
  const sortedClients = useMemo(() => {
    if (!clients?.length) return [];
    const arr = [...clients];
    arr.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortField) {
        case 'totalRewarded':
          aVal = weiToEth(a.totalRewarded); bVal = weiToEth(b.totalRewarded); break;
        case 'balance':
          aVal = weiToEth(a.totalRewarded) - weiToEth(a.totalWithdrawn);
          bVal = weiToEth(b.totalRewarded) - weiToEth(b.totalWithdrawn); break;
        case 'voteCount': aVal = a.voteCount; bVal = b.voteCount; break;
        case 'proposalCount': aVal = a.proposalCount; bVal = b.proposalCount; break;
        case 'auctionCount': aVal = a.auctionCount; bVal = b.auctionCount; break;
        case 'bidCount': aVal = a.bidCount; bVal = b.bidCount; break;
        default: aVal = weiToEth(a.totalRewarded); bVal = weiToEth(b.totalRewarded);
      }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return arr;
  }, [clients, sortField, sortDir]);

  // Reward economics chart data (from ProposalRewardsUpdated events)
  const rewardEconData = useMemo(() => {
    if (!rewardUpdates?.length) return [];
    return rewardUpdates
      .filter((u) => u.rewardPerProposal && u.rewardPerVote)
      .map((u) => ({
        label: `P${u.firstProposalId}-${u.lastProposalId}`,
        date: shortDate(u.blockTimestamp),
        rewardPerProposal: Number(weiToEth(u.rewardPerProposal!).toFixed(6)),
        rewardPerVote: Number(weiToEth(u.rewardPerVote!).toFixed(8)),
      }));
  }, [rewardUpdates]);

  // Auction revenue bar chart data
  const revenueData = useMemo(() => {
    if (!rewardUpdates?.length) return [];
    return rewardUpdates
      .filter((u) => u.auctionRevenue)
      .map((u) => ({
        label: `P${u.firstProposalId}-${u.lastProposalId}`,
        date: shortDate(u.blockTimestamp),
        revenue: Number(weiToEth(u.auctionRevenue!).toFixed(4)),
        rewardPerProposal: Number(weiToEth(u.rewardPerProposal || '0').toFixed(6)),
      }));
  }, [rewardUpdates]);

  // Sort handler
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

  // Detail view
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

  // Loading state
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

  const sortArrow = (field: string) =>
    sortField === field ? (sortDir === 'desc' ? ' \u25BE' : ' \u25B4') : '';

  return (
    <div className={styles.clients}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.toolbarTitle}>Client Incentives</span>
        <span className={styles.toolbarBadge}>{totals.count} clients</span>
      </div>

      <div className={styles.content}>
        {/* Summary cards -- 5 columns */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Rewarded</div>
            <div className={styles.statValue}>{formatEth(totals.rewarded)} ETH</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Withdrawn</div>
            <div className={styles.statValue}>{formatEth(totals.withdrawn)} ETH</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Pending Balance</div>
            <div className={styles.statValue}>{formatEth(totals.balance)} ETH</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Registered Clients</div>
            <div className={styles.statValue}>{totals.count}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Bids</div>
            <div className={styles.statValue}>{totals.bids.toLocaleString()}</div>
          </div>
        </div>

        {/* Reward Economics charts row */}
        {rewardEconData.length > 0 && (
          <div className={styles.chartsRow}>
            {/* Reward per Proposal over time */}
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>Reward per Proposal Over Time</div>
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

            {/* Auction Revenue per update */}
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
          </div>
        )}

        {/* Leaderboard table */}
        <h3 className={styles.sectionTitle}>Client Leaderboard</h3>
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
      </div>
    </div>
  );
}

// ============================================================================
// CLIENT DETAIL VIEW
// ============================================================================

function ClientDetail({
  client,
  rewardUpdates,
  onBack,
}: {
  client: ClientData;
  rewardUpdates: RewardUpdate[];
  onBack: () => void;
}) {
  const { data: activity, isLoading: activityLoading } = useClientActivity(client.clientId);
  const { data: rewards } = useClientRewardsTimeSeries(client.clientId);

  const balance = weiToEth(client.totalRewarded) - weiToEth(client.totalWithdrawn);

  // Reward timeline for this client
  const rewardTimeline = useMemo(() => {
    if (!rewards?.length) return [];
    const monthMap = new Map<string, number>();
    let cumulative = 0;
    for (const r of rewards) {
      const date = new Date(Number(r.blockTimestamp) * 1000);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      cumulative += weiToEth(r.amount);
      monthMap.set(key, cumulative);
    }
    return Array.from(monthMap.entries()).map(([month, total]) => ({
      month, total: Number(total.toFixed(4)),
    }));
  }, [rewards]);

  return (
    <div className={styles.clients}>
      <div className={styles.detailPanel}>
        <div className={styles.detailHeader}>
          <button className={styles.backButton} onClick={onBack}>&larr; Back</button>
          <span className={styles.detailTitle}>
            {client.name || `Client ${client.clientId}`}
            {client.approved && <span className={styles.approvedBadge} />}
          </span>
        </div>

        <div className={styles.detailContent}>
          {/* Stats -- 4 columns */}
          <div className={styles.detailStatsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Rewarded</div>
              <div className={styles.statValue}>{formatEth(weiToEth(client.totalRewarded))} ETH</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Withdrawn</div>
              <div className={styles.statValue}>{formatEth(weiToEth(client.totalWithdrawn))} ETH</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Pending</div>
              <div className={styles.statValue}>{formatEth(balance)} ETH</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Votes</div>
              <div className={styles.statValue}>{client.voteCount.toLocaleString()}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Proposals</div>
              <div className={styles.statValue}>{client.proposalCount}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Bids</div>
              <div className={styles.statValue}>{client.bidCount.toLocaleString()}</div>
              {client.bidCount > 0 && (
                <div className={styles.statSub}>{formatEth(weiToEth(client.bidVolume))} ETH vol</div>
              )}
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Auctions Won</div>
              <div className={styles.statValue}>{client.auctionCount}</div>
              {client.auctionCount > 0 && (
                <div className={styles.statSub}>{formatEth(weiToEth(client.auctionVolume))} ETH vol</div>
              )}
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Status</div>
              <div className={styles.statValue}>{client.approved ? 'Approved' : 'Pending'}</div>
              <div className={styles.statSub}>ID: {client.clientId}</div>
            </div>
          </div>

          {client.description && (
            <div className={styles.detailSection}>
              <h3 className={styles.sectionTitle}>Description</h3>
              <div style={{ fontSize: 13, color: 'var(--text-secondary, #6e6e73)' }}>
                {client.description}
              </div>
            </div>
          )}

          {/* Reward timeline chart */}
          {rewardTimeline.length > 0 && (
            <div className={styles.detailSection}>
              <div className={styles.chartCardWide}>
                <div className={styles.chartTitle}>Cumulative Rewards</div>
                <div className={styles.chartContainerWide}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={rewardTimeline} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                      <defs>
                        <linearGradient id="detailGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#5B8DEF" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#5B8DEF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e5e5e5)" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={50} />
                      <Tooltip content={<EthTooltip />} />
                      <Area type="monotone" dataKey="total" name="Cumulative" stroke="#5B8DEF"
                        fill="url(#detailGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Recent activity */}
          <div className={styles.detailSection}>
            <h3 className={styles.sectionTitle}>Recent Activity</h3>
            {activityLoading ? (
              <div className={styles.loading} style={{ height: 80 }}>
                <div className={styles.spinner} />
              </div>
            ) : (
              <div className={styles.activityList}>
                {/* Bids */}
                {activity?.bids?.slice(0, 15).map((b: any) => (
                  <div key={b.id} className={styles.activityItem}>
                    <div className={`${styles.activityIcon} ${styles.activityIconBid}`}>B</div>
                    <span className={styles.activityText}>
                      Bid on Noun {b.noun_id}
                    </span>
                    <span className={styles.activityAmount}>
                      {formatEth(weiToEth(b.amount))} ETH
                    </span>
                    <span className={styles.activityTime}>{timeAgo(b.block_timestamp)}</span>
                  </div>
                ))}

                {/* Votes */}
                {activity?.votes?.slice(0, 15).map((v: any) => (
                  <div key={v.id} className={styles.activityItem}>
                    <div className={`${styles.activityIcon} ${styles.activityIconVote}`}>
                      {v.support === 1 ? '\u2713' : v.support === 0 ? '\u2717' : '\u2014'}
                    </div>
                    <span className={styles.activityText}>
                      Voted on Prop {v.proposal_id}
                      {v.proposal_title ? `: ${v.proposal_title}` : ''}
                    </span>
                    <span className={styles.activityTime}>{timeAgo(v.block_timestamp)}</span>
                  </div>
                ))}

                {/* Proposals */}
                {activity?.proposals?.slice(0, 10).map((p: any) => (
                  <div key={p.id} className={styles.activityItem}>
                    <div className={`${styles.activityIcon} ${styles.activityIconProposal}`}>P</div>
                    <span className={styles.activityText}>
                      Prop {p.id}: {p.title || 'Untitled'}
                    </span>
                    <span className={styles.activityTime}>{timeAgo(p.created_timestamp)}</span>
                  </div>
                ))}

                {/* Withdrawals */}
                {activity?.withdrawals?.slice(0, 10).map((w: any) => (
                  <div key={w.id} className={styles.activityItem}>
                    <div className={`${styles.activityIcon} ${styles.activityIconWithdrawal}`}>W</div>
                    <span className={styles.activityText}>Withdrawal</span>
                    <span className={styles.activityAmount}>{formatEth(weiToEth(w.amount))} ETH</span>
                    <span className={styles.activityTime}>{timeAgo(w.block_timestamp)}</span>
                  </div>
                ))}

                {!activity?.votes?.length && !activity?.proposals?.length &&
                 !activity?.withdrawals?.length && !activity?.bids?.length && (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyText}>No recent activity</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reward Update History */}
          {rewardUpdates.length > 0 && (
            <div className={styles.detailSection}>
              <h3 className={styles.sectionTitle}>Reward Update History</h3>
              <div className={styles.activityList}>
                {rewardUpdates.slice().reverse().slice(0, 20).map((u) => (
                  <div key={u.id} className={styles.updateItem}>
                    <div className={`${styles.activityIcon} ${styles.activityIconUpdate}`}>R</div>
                    <div style={{ flex: 1 }}>
                      <span className={styles.activityText} style={{ whiteSpace: 'normal' }}>
                        {u.updateType === 'PROPOSAL'
                          ? `Proposals ${u.firstProposalId}\u2013${u.lastProposalId}`
                          : `Auctions ${u.firstAuctionId}\u2013${u.lastAuctionId}`}
                      </span>
                      {u.updateType === 'PROPOSAL' && (
                        <div className={styles.updateMeta}>
                          {u.auctionRevenue && (
                            <div className={styles.updateMetaItem}>
                              <span className={styles.updateMetaLabel}>Revenue</span>
                              <span className={styles.updateMetaValue}>{formatEth(weiToEth(u.auctionRevenue))} ETH</span>
                            </div>
                          )}
                          {u.rewardPerProposal && (
                            <div className={styles.updateMetaItem}>
                              <span className={styles.updateMetaLabel}>Per Proposal</span>
                              <span className={styles.updateMetaValue}>{formatEth(weiToEth(u.rewardPerProposal))} ETH</span>
                            </div>
                          )}
                          {u.rewardPerVote && (
                            <div className={styles.updateMetaItem}>
                              <span className={styles.updateMetaLabel}>Per Vote</span>
                              <span className={styles.updateMetaValue}>{formatEth(weiToEth(u.rewardPerVote))} ETH</span>
                            </div>
                          )}
                          {u.firstAuctionIdForRevenue && (
                            <div className={styles.updateMetaItem}>
                              <span className={styles.updateMetaLabel}>Auction Range</span>
                              <span className={styles.updateMetaValue}>{u.firstAuctionIdForRevenue}\u2013{u.lastAuctionIdForRevenue}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <span className={styles.activityTime}>{formatDate(u.blockTimestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className={styles.detailSection}>
            <h3 className={styles.sectionTitle}>Details</h3>
            <div className={styles.activityItem}>
              <span className={styles.activityText}>Client ID</span>
              <span className={styles.activityAmount}>{client.clientId}</span>
            </div>
            <div className={styles.activityItem}>
              <span className={styles.activityText}>Registered</span>
              <span className={styles.activityAmount}>{formatDate(client.blockTimestamp)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Clients;
