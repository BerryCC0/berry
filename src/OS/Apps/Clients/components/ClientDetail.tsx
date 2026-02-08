/**
 * Client Detail View
 * Shows detailed info, charts, and activity for a single client
 */

'use client';

import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  useClientRewardsTimeSeries,
  useClientActivity,
  type ClientData,
  type RewardUpdate,
} from '../hooks/useClientIncentives';
import { weiToEth, formatEth, timeAgo, formatDate } from '../utils';
import { EthTooltip } from './ChartTooltips';
import styles from '../Clients.module.css';

interface ClientDetailProps {
  client: ClientData;
  rewardUpdates: RewardUpdate[];
  onBack: () => void;
}

export function ClientDetail({ client, rewardUpdates, onBack }: ClientDetailProps) {
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
