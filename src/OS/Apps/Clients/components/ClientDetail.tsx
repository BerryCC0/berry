/**
 * Client Detail View
 * Shows detailed info, charts, and activity for a single client
 */

'use client';

import { useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useAccount, useSimulateContract, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { useClientRewardsTimeSeries, useClientActivity } from '../hooks/useClientIncentives';
import { ClientRewardsABI } from '@/app/lib/nouns/abis/ClientRewards';
import { CLIENT_REWARDS_ADDRESS } from '../constants';
import type { ClientData, RewardUpdate } from '../types';
import { weiToEth, formatEth, timeAgo, formatDate } from '../utils';
import { EthTooltip } from './ChartTooltips';
import styles from '../Clients.module.css';

interface ClientDetailProps {
  client: ClientData;
  rewardUpdates: RewardUpdate[];
  onBack: () => void;
  isOwner?: boolean;
}

// --- Withdraw hook ---
function useWithdrawBalance(clientId: number, enabled: boolean) {
  const { address } = useAccount();

  // Read current on-chain balance
  const { data: balanceRaw, refetch: refetchBalance } = useReadContract({
    address: CLIENT_REWARDS_ADDRESS,
    abi: ClientRewardsABI,
    functionName: 'clientBalance',
    args: [clientId],
    query: { enabled },
  });

  const hasBalance = balanceRaw != null && balanceRaw > BigInt(0);

  const { data: simData, error: simError } = useSimulateContract({
    address: CLIENT_REWARDS_ADDRESS,
    abi: ClientRewardsABI,
    functionName: 'withdrawClientBalance',
    args: address && balanceRaw ? [clientId, address, balanceRaw] : undefined,
    query: { enabled: enabled && !!address && hasBalance },
  });

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const execute = () => {
    if (simData?.request) {
      writeContract(simData.request);
    }
  };

  return {
    execute,
    isPending,
    isConfirming,
    isSuccess,
    canExecute: !!simData?.request && !simError,
    balanceRaw,
    balanceFormatted: balanceRaw ? formatEther(balanceRaw) : '0',
    hasBalance,
    error: writeError || simError,
    reset,
    refetchBalance,
  };
}

// --- Update metadata hook ---
function useUpdateMetadata(clientId: number, name: string, description: string, enabled: boolean) {
  const { data: simData, error: simError } = useSimulateContract({
    address: CLIENT_REWARDS_ADDRESS,
    abi: ClientRewardsABI,
    functionName: 'updateClientMetadata',
    args: [clientId, name, description],
    query: { enabled: enabled && name.length > 0 },
  });

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const execute = () => {
    if (simData?.request) {
      writeContract(simData.request);
    }
  };

  return {
    execute,
    isPending,
    isConfirming,
    isSuccess,
    canExecute: !!simData?.request && !simError,
    error: writeError || simError,
    reset,
  };
}

export function ClientDetail({ client, rewardUpdates, onBack, isOwner }: ClientDetailProps) {
  const { data: activity, isLoading: activityLoading } = useClientActivity(client.clientId);
  const { data: rewards } = useClientRewardsTimeSeries(client.clientId);

  const balance = weiToEth(client.totalRewarded) - weiToEth(client.totalWithdrawn);

  // UI state
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [activityTab, setActivityTab] = useState<'votes' | 'proposals' | 'bids' | 'withdrawals' | 'rewards'>('votes');

  // Owner actions state
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaName, setMetaName] = useState(client.name || '');
  const [metaDescription, setMetaDescription] = useState(client.description || '');

  // Owner hooks
  const withdraw = useWithdrawBalance(client.clientId, !!isOwner);
  const updateMeta = useUpdateMetadata(client.clientId, metaName, metaDescription, !!isOwner && editingMeta);

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
          <div className={styles.detailTitleBlock}>
            <span className={styles.detailTitle}>
              {client.name || `Client ${client.clientId}`}
              {client.approved && <span className={styles.approvedBadge} />}
              {isOwner && (
                <button
                  className={styles.editMetaButton}
                  onClick={() => setEditingMeta((v) => !v)}
                >
                  {editingMeta ? 'Cancel' : 'Edit'}
                </button>
              )}
            </span>
            {client.description && (
              <span className={styles.detailDescription}>{client.description}</span>
            )}
            <span className={styles.detailSubtitle}>
              ID: {client.clientId} · Registered {formatDate(client.blockTimestamp)}
            </span>
          </div>
          {isOwner && (
            <button
              className={`${styles.updateButton} ${withdraw.isPending || withdraw.isConfirming ? styles.updateButtonPending : ''}`}
              disabled={!withdraw.canExecute || withdraw.isPending || withdraw.isConfirming || withdraw.isSuccess}
              onClick={withdraw.execute}
              title={
                withdraw.isSuccess ? 'Withdrawn!'
                  : !withdraw.hasBalance ? 'No balance to withdraw'
                  : withdraw.canExecute ? `Withdraw ${formatEth(Number(withdraw.balanceFormatted))} ETH`
                  : 'Cannot withdraw'
              }
            >
              {withdraw.isSuccess ? '✓ Withdrawn'
                : withdraw.isConfirming ? 'Confirming…'
                : withdraw.isPending ? 'Pending…'
                : `Withdraw${withdraw.hasBalance ? ` ${formatEth(Number(withdraw.balanceFormatted))} ETH` : ''}`}
            </button>
          )}
        </div>

        {/* Inline metadata editor */}
        {isOwner && editingMeta && (
          <div className={styles.metadataEditor}>
            <div className={styles.metaField}>
              <label className={styles.metaLabel}>Name</label>
              <input
                className={styles.metaInput}
                value={metaName}
                onChange={(e) => setMetaName(e.target.value)}
                placeholder="Client name"
              />
            </div>
            <div className={styles.metaField}>
              <label className={styles.metaLabel}>Description</label>
              <textarea
                className={styles.metaTextarea}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Client description"
                rows={3}
              />
            </div>
            <button
              className={`${styles.updateButton} ${updateMeta.isPending || updateMeta.isConfirming ? styles.updateButtonPending : ''}`}
              disabled={!updateMeta.canExecute || updateMeta.isPending || updateMeta.isConfirming || updateMeta.isSuccess || metaName.length === 0}
              onClick={updateMeta.execute}
            >
              {updateMeta.isSuccess ? '✓ Updated'
                : updateMeta.isConfirming ? 'Confirming…'
                : updateMeta.isPending ? 'Pending…'
                : 'Save Metadata'}
            </button>
          </div>
        )}

        <div className={styles.detailContent}>
          {/* Collapsible overview */}
          <button
            className={styles.collapseToggle}
            onClick={() => setOverviewOpen((v) => !v)}
          >
            <span className={`${styles.collapseArrow} ${overviewOpen ? styles.collapseArrowOpen : ''}`}>&#9654;</span>
            Overview &amp; Stats
          </button>
          {overviewOpen && (
            <div className={styles.collapseContent}>
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
                  <div className={styles.statLabel}>Status</div>
                  <div className={styles.statValue}>{client.approved ? 'Approved' : 'Pending'}</div>
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
              </div>

              {rewardTimeline.length > 0 && (
                <div className={styles.detailSection}>
                  <div className={styles.chartCardWide}>
                    <div className={styles.chartTitle}>Cumulative Rewards</div>
                    <div className={styles.chartContainerWide}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={rewardTimeline} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                          <defs>
                            <linearGradient id="detailGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--berry-accent, #5B8DEF)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="var(--berry-accent, #5B8DEF)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--berry-border, #e5e5e5)" />
                          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} width={50} />
                          <Tooltip content={<EthTooltip />} />
                          <Area type="monotone" dataKey="total" name="Cumulative" stroke="var(--berry-accent, #5B8DEF)"
                            fill="url(#detailGrad)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Activity tabs */}
          <div className={styles.detailSection}>
            <div className={styles.bottomTabs}>
              <button
                className={`${styles.bottomTab} ${activityTab === 'votes' ? styles.bottomTabActive : ''}`}
                onClick={() => setActivityTab('votes')}
              >
                Votes{activity?.votes?.length ? ` (${activity.votes.length})` : ''}
              </button>
              <button
                className={`${styles.bottomTab} ${activityTab === 'proposals' ? styles.bottomTabActive : ''}`}
                onClick={() => setActivityTab('proposals')}
              >
                Proposals{activity?.proposals?.length ? ` (${activity.proposals.length})` : ''}
              </button>
              <button
                className={`${styles.bottomTab} ${activityTab === 'bids' ? styles.bottomTabActive : ''}`}
                onClick={() => setActivityTab('bids')}
              >
                Bids{activity?.bids?.length ? ` (${activity.bids.length})` : ''}
              </button>
              <button
                className={`${styles.bottomTab} ${activityTab === 'withdrawals' ? styles.bottomTabActive : ''}`}
                onClick={() => setActivityTab('withdrawals')}
              >
                Withdrawals{activity?.withdrawals?.length ? ` (${activity.withdrawals.length})` : ''}
              </button>
              <button
                className={`${styles.bottomTab} ${activityTab === 'rewards' ? styles.bottomTabActive : ''}`}
                onClick={() => setActivityTab('rewards')}
              >
                Reward Updates{rewardUpdates.length ? ` (${rewardUpdates.length})` : ''}
              </button>
            </div>

            {activityLoading ? (
              <div className={styles.loading} style={{ height: 80 }}>
                <div className={styles.spinner} />
              </div>
            ) : (
              <div className={styles.activityList}>
                {activityTab === 'votes' && (
                  <>
                    {activity?.votes?.slice(0, 30).map((v: any) => (
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
                    {!activity?.votes?.length && (
                      <div className={styles.emptyState}><div className={styles.emptyText}>No votes</div></div>
                    )}
                  </>
                )}

                {activityTab === 'proposals' && (
                  <>
                    {activity?.proposals?.slice(0, 20).map((p: any) => (
                      <div key={p.id} className={styles.activityItem}>
                        <div className={`${styles.activityIcon} ${styles.activityIconProposal}`}>P</div>
                        <span className={styles.activityText}>
                          Prop {p.id}: {p.title || 'Untitled'}
                        </span>
                        <span className={styles.activityTime}>{timeAgo(p.created_timestamp)}</span>
                      </div>
                    ))}
                    {!activity?.proposals?.length && (
                      <div className={styles.emptyState}><div className={styles.emptyText}>No proposals</div></div>
                    )}
                  </>
                )}

                {activityTab === 'bids' && (
                  <>
                    {activity?.bids?.slice(0, 30).map((b: any) => (
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
                    {!activity?.bids?.length && (
                      <div className={styles.emptyState}><div className={styles.emptyText}>No bids</div></div>
                    )}
                  </>
                )}

                {activityTab === 'withdrawals' && (
                  <>
                    {activity?.withdrawals?.slice(0, 20).map((w: any) => (
                      <div key={w.id} className={styles.activityItem}>
                        <div className={`${styles.activityIcon} ${styles.activityIconWithdrawal}`}>W</div>
                        <span className={styles.activityText}>Withdrawal</span>
                        <span className={styles.activityAmount}>{formatEth(weiToEth(w.amount))} ETH</span>
                        <span className={styles.activityTime}>{timeAgo(w.block_timestamp)}</span>
                      </div>
                    ))}
                    {!activity?.withdrawals?.length && (
                      <div className={styles.emptyState}><div className={styles.emptyText}>No withdrawals</div></div>
                    )}
                  </>
                )}

                {activityTab === 'rewards' && (
                  <>
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
                    {!rewardUpdates.length && (
                      <div className={styles.emptyState}><div className={styles.emptyText}>No reward updates</div></div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
