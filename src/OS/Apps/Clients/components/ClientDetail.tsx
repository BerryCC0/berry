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
import { useAccount, useSimulateContract, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBlockNumber } from 'wagmi';
import { formatEther } from 'viem';
import { useClientRewardsTimeSeries, useClientActivity } from '../hooks/useClientIncentives';
import { ClientRewardsABI } from '@/app/lib/nouns/abis/ClientRewards';
import { CLIENT_REWARDS_ADDRESS } from '../constants';
import type { ClientData, RewardUpdate } from '../types';
import { weiToEth, formatEth, timeAgo, formatDate } from '../utils';
import { EthTooltip } from './ChartTooltips';
import { useENSBatch } from '@/OS/hooks';
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
  const { data: currentBlock } = useBlockNumber({ watch: false });

  const balance = weiToEth(client.totalRewarded) - weiToEth(client.totalWithdrawn);

  // UI state
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [activityTab, setActivityTab] = useState<'votes' | 'proposals' | 'bids' | 'withdrawals' | 'rewards'>('votes');
  const [voteDisplayLimit, setVoteDisplayLimit] = useState(50);

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

  // Build a lookup: for each proposal ID, check if it was included in a reward update
  // and what the reward-per-proposal was for that update
  const proposalRewardLookup = useMemo(() => {
    const lookup = new Map<number, { rewardPerProposal: number; rewardPerVote: number }>();
    if (!rewardUpdates.length) return lookup;
    for (const u of rewardUpdates) {
      if (u.updateType !== 'PROPOSAL' || !u.firstProposalId || !u.lastProposalId) continue;
      const first = Number(u.firstProposalId);
      const last = Number(u.lastProposalId);
      const rpp = u.rewardPerProposal ? Number(u.rewardPerProposal) / 1e18 : 0;
      const rpv = u.rewardPerVote ? Number(u.rewardPerVote) / 1e18 : 0;
      for (let id = first; id <= last; id++) {
        lookup.set(id, { rewardPerProposal: rpp, rewardPerVote: rpv });
      }
    }
    return lookup;
  }, [rewardUpdates]);

  // Vote summary stats
  const voteSummary = useMemo(() => {
    if (!activity?.votes?.length) return null;
    const votes = activity.votes;
    let forVotes = 0, againstVotes = 0, abstainVotes = 0;
    let totalWeight = 0;
    const uniqueVoters = new Set<string>();
    const uniqueProps = new Set<number>();
    for (const v of votes) {
      if (v.support === 1) forVotes++;
      else if (v.support === 0) againstVotes++;
      else abstainVotes++;
      totalWeight += Number(v.votes || 0);
      uniqueVoters.add(v.voter?.toLowerCase());
      uniqueProps.add(v.proposal_id);
    }
    return { forVotes, againstVotes, abstainVotes, totalWeight, uniqueVoters: uniqueVoters.size, uniqueProps: uniqueProps.size, total: votes.length };
  }, [activity?.votes]);

  // Extract unique addresses from visible votes and proposals for ENS resolution
  const visibleAddresses = useMemo(() => {
    const seen = new Set<string>();
    const addrs: string[] = [];
    // Voter addresses from visible votes
    if (activity?.votes?.length) {
      for (const v of activity.votes.slice(0, voteDisplayLimit)) {
        const addr = v.voter?.toLowerCase();
        if (addr && !seen.has(addr)) {
          seen.add(addr);
          addrs.push(v.voter);
        }
      }
    }
    // Proposer addresses from proposals
    if (activity?.proposals?.length) {
      for (const p of activity.proposals) {
        const addr = p.proposer?.toLowerCase();
        if (addr && !seen.has(addr)) {
          seen.add(addr);
          addrs.push(p.proposer);
        }
      }
    }
    return addrs;
  }, [activity?.votes, activity?.proposals, voteDisplayLimit]);

  const ensMap = useENSBatch(visibleAddresses);

  return (
    <div className={styles.clients}>
      <div className={styles.detailPanel}>
        <div className={styles.detailHeader}>
          <button className={styles.backButton} onClick={onBack}>&larr; Back</button>
          {client.nftImage && (
            <img
              src={client.nftImage}
              alt={client.name || `Client ${client.clientId}`}
              className={styles.detailAvatar}
            />
          )}
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
          <div className={styles.headerStats}>
            <div className={styles.headerStat}>
              <span className={styles.headerStatLabel}>Rewarded</span>
              <span className={styles.headerStatValue}>{formatEth(weiToEth(client.totalRewarded))} ETH</span>
            </div>
            <div className={styles.headerStat}>
              <span className={styles.headerStatLabel}>Balance</span>
              <span className={styles.headerStatValue}>{formatEth(balance)} ETH</span>
            </div>
            <div className={styles.headerStat}>
              <span className={styles.headerStatLabel}>Votes</span>
              <span className={styles.headerStatValue}>{client.voteCount.toLocaleString()}</span>
            </div>
            <div className={styles.headerStat}>
              <span className={styles.headerStatLabel}>Props</span>
              <span className={styles.headerStatValue}>{client.proposalCount}</span>
            </div>
            <div className={styles.headerStat}>
              <span className={styles.headerStatLabel}>Bids</span>
              <span className={styles.headerStatValue}>{client.bidCount.toLocaleString()}</span>
            </div>
            <div className={styles.headerStat}>
              <span className={styles.headerStatLabel}>Wins</span>
              <span className={styles.headerStatValue}>{client.auctionCount}</span>
            </div>
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
                    {activity?.votes?.length ? (
                      <>
                        {voteSummary && (
                          <div className={styles.votesSummary}>
                            <span>{voteSummary.uniqueVoters} voter{voteSummary.uniqueVoters !== 1 ? 's' : ''}</span>
                            <span>{voteSummary.uniqueProps} proposal{voteSummary.uniqueProps !== 1 ? 's' : ''}</span>
                            <span>{voteSummary.totalWeight.toLocaleString()} total votes</span>
                            <span style={{ marginLeft: 'auto' }}>
                              {voteSummary.forVotes} for · {voteSummary.againstVotes} against · {voteSummary.abstainVotes} abstain
                            </span>
                          </div>
                        )}
                        <div className={styles.votesTableWrap}>
                          <table className={styles.votesTable}>
                            <thead>
                              <tr>
                                <th>Proposal</th>
                                <th>Voter</th>
                                <th>Vote</th>
                                <th style={{ textAlign: 'right' }}>Weight</th>
                                <th style={{ textAlign: 'right' }}>When</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activity.votes.slice(0, voteDisplayLimit).map((v: any) => (
                                <tr key={v.id}>
                                  <td>
                                    <span className={styles.proposalLink} title={v.proposal_title || `Prop ${v.proposal_id}`}>
                                      {v.proposal_id}{v.proposal_title ? `: ${v.proposal_title}` : ''}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={styles.voterAddress} title={v.voter}>
                                      {ensMap.get(v.voter)?.displayName || ensMap.get(v.voter?.toLowerCase())?.displayName || `${v.voter?.slice(0, 6)}…${v.voter?.slice(-4)}`}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`${styles.voteSupport} ${
                                      v.support === 1 ? styles.voteSupportFor
                                        : v.support === 0 ? styles.voteSupportAgainst
                                        : styles.voteSupportAbstain
                                    }`}>
                                      {v.support === 1 ? 'For' : v.support === 0 ? 'Against' : 'Abstain'}
                                    </span>
                                  </td>
                                  <td className={styles.voteWeight}>{Number(v.votes).toLocaleString()}</td>
                                  <td style={{ textAlign: 'right' }}>
                                    <span className={styles.activityTime}>{timeAgo(v.block_timestamp)}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {activity.votes.length > voteDisplayLimit && (
                          <div className={styles.loadMoreRow}>
                            <button
                              className={styles.loadMoreButton}
                              onClick={() => setVoteDisplayLimit((prev) => Math.min(prev + 100, activity.votes.length))}
                            >
                              Show more ({Math.min(100, activity.votes.length - voteDisplayLimit)} more of {activity.votes.length - voteDisplayLimit} remaining)
                            </button>
                            {activity.votes.length - voteDisplayLimit > 100 && (
                              <>
                                {' '}
                                <button
                                  className={styles.loadMoreButton}
                                  onClick={() => setVoteDisplayLimit(activity.votes.length)}
                                >
                                  Show all
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className={styles.emptyState}><div className={styles.emptyText}>No votes</div></div>
                    )}
                  </>
                )}

                {activityTab === 'proposals' && (
                  <>
                    {activity?.proposals?.length ? activity.proposals.map((p: any) => {
                      const forVotes = Number(p.for_votes || 0);
                      const againstVotes = Number(p.against_votes || 0);
                      const abstainVotes = Number(p.abstain_votes || 0);
                      const quorum = Number(p.quorum_votes || 0) || 1;
                      const totalVotes = forVotes + againstVotes + abstainVotes;

                      // Derive real status from block data when indexed status is stale
                      let derivedStatus = p.status as string;
                      if (currentBlock && ['PENDING', 'ACTIVE', 'UPDATABLE', 'OBJECTION_PERIOD'].includes(p.status)) {
                        const startBlock = BigInt(p.start_block || '0');
                        const endBlock = BigInt(p.end_block || '0');
                        if (currentBlock > endBlock && endBlock > BigInt(0)) {
                          derivedStatus = forVotes >= quorum ? 'SUCCEEDED' : 'DEFEATED';
                        } else if (currentBlock >= startBlock && startBlock > BigInt(0)) {
                          derivedStatus = 'ACTIVE';
                        }
                      }

                      const isActive = ['ACTIVE', 'OBJECTION_PERIOD'].includes(derivedStatus);
                      const isPending = derivedStatus === 'PENDING';
                      const isUpdatable = derivedStatus === 'UPDATABLE';
                      const isDefeated = derivedStatus === 'DEFEATED';
                      const isExecuted = derivedStatus === 'EXECUTED';
                      const isSucceeded = derivedStatus === 'SUCCEEDED';
                      const isQueued = derivedStatus === 'QUEUED';
                      const isCancelled = derivedStatus === 'CANCELLED';
                      const isVetoed = derivedStatus === 'VETOED';

                      const statusClass = isActive ? styles.proposalStatusActive
                        : isPending ? styles.proposalStatusUpdatable
                        : isUpdatable ? styles.proposalStatusUpdatable
                        : isDefeated || isCancelled || isVetoed ? styles.proposalStatusDefeated
                        : isExecuted || isSucceeded ? styles.proposalStatusExecuted
                        : isQueued ? styles.proposalStatusQueued
                        : '';

                      const statusLabel = isActive ? 'Voting'
                        : derivedStatus === 'OBJECTION_PERIOD' ? 'Objection'
                        : isPending ? 'Pending'
                        : isUpdatable ? 'Updatable'
                        : isDefeated ? 'Defeated'
                        : isExecuted ? 'Executed'
                        : isSucceeded ? 'Succeeded'
                        : isQueued ? 'Queued'
                        : isCancelled ? 'Cancelled'
                        : isVetoed ? 'Vetoed'
                        : derivedStatus;

                      const maxVotes = Math.max(totalVotes, quorum);
                      const forWidth = maxVotes > 0 ? (forVotes / maxVotes) * 100 : 0;
                      const againstWidth = maxVotes > 0 ? (againstVotes / maxVotes) * 100 : 0;
                      const abstainWidth = maxVotes > 0 ? (abstainVotes / maxVotes) * 100 : 0;
                      const quorumPosition = maxVotes > 0 ? (quorum / maxVotes) * 100 : 0;

                      const proposerDisplay = ensMap.get(p.proposer)?.displayName
                        || ensMap.get(p.proposer?.toLowerCase())?.displayName
                        || `${p.proposer?.slice(0, 6)}…${p.proposer?.slice(-4)}`;

                      // Eligibility: same logic as main proposals tab
                      const eligibility = isCancelled || isVetoed
                        ? 'ineligible'
                        : forVotes >= quorum
                          ? 'eligible'
                          : isDefeated
                            ? 'ineligible'
                            : (isActive || isPending || isUpdatable)
                              ? 'pending'
                              : 'ineligible';

                      // Reward lookup: was this proposal included in a past reward distribution?
                      const rewardInfo = proposalRewardLookup.get(Number(p.id));
                      const wasRewarded = !!rewardInfo;
                      const estimatedReward = rewardInfo
                        ? rewardInfo.rewardPerProposal
                        : 0;

                      return (
                        <div key={p.id} className={styles.proposalItem}>
                          <div className={styles.proposalItemContent}>
                            <div className={styles.proposalMeta}>
                              <span className={styles.proposalNumber}>Prop {p.id}</span>
                              {' by '}
                              <span className={styles.voterAddress} title={p.proposer}>{proposerDisplay}</span>
                              <span className={styles.activityTime} style={{ marginLeft: 'auto' }}>{timeAgo(p.created_timestamp)}</span>
                            </div>
                            <div className={styles.proposalItemTitle}>{p.title || 'Untitled'}</div>
                            {(isActive || totalVotes > 0) && (
                              <div className={styles.proposalVoteBar}>
                                {forVotes > 0 && <div className={styles.voteBarFor} style={{ width: `${forWidth}%` }} />}
                                {abstainVotes > 0 && <div className={styles.voteBarAbstain} style={{ width: `${abstainWidth}%` }} />}
                                {againstVotes > 0 && <div className={styles.voteBarAgainst} style={{ width: `${againstWidth}%` }} />}
                                <div className={styles.voteBarQuorum} style={{ left: `${quorumPosition}%` }} />
                              </div>
                            )}
                            <div className={styles.proposalStats}>
                              <span className={`${styles.proposalStatusBadge} ${statusClass}`}>{statusLabel}</span>
                              {wasRewarded ? (
                                <span className={styles.proposalRewarded}>Rewarded</span>
                              ) : eligibility === 'eligible' ? (
                                <span className={styles.proposalEligible}>Eligible</span>
                              ) : eligibility === 'pending' ? (
                                <span className={styles.proposalPending}>Pending</span>
                              ) : (
                                <span className={styles.proposalIneligible}>Ineligible</span>
                              )}
                              <span className={styles.proposalVoteSummary}>
                                {forVotes.toLocaleString()} for
                                {againstVotes > 0 && <> · {againstVotes.toLocaleString()} against</>}
                                {abstainVotes > 0 && <> · {abstainVotes.toLocaleString()} abstain</>}
                                {' · '}{quorum} quorum
                              </span>
                              {wasRewarded && estimatedReward > 0 && (
                                <span className={styles.proposalRewardAmount}>
                                  ~{formatEth(estimatedReward)} ETH/prop
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }) : (
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
