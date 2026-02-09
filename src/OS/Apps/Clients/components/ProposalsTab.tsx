/**
 * Proposals Tab
 * Current cycle proposals with distribution charts, pool info, and proposal list.
 */

'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, LabelList,
} from 'recharts';
import type {
  ClientData, ClientMetadataMap, DistributionItem,
  ProposalBreakdownEntry, CycleRewardEntry, CycleProgress,
} from '../types';
import type { Proposal } from '@/OS/Apps/Camp/types';
import { useUpdateProposalRewards } from '../hooks/useUpdateRewards';
import { getClientName } from '@/OS/lib/clientNames';
import { CHART_COLORS } from '../constants';
import { formatEth } from '../utils';
import { EthTooltip } from './ChartTooltips';
import { ClientTick } from './ClientTick';
import styles from '../Clients.module.css';

/** Format seconds into a human-readable duration string */
function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0m';
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

interface ProposalsTabProps {
  proposalsByClient: DistributionItem[];
  votesByClient: DistributionItem[];
  cycleRewardsByClient: CycleRewardEntry[];
  clientMetadata?: ClientMetadataMap;
  clients?: ClientData[];
  pendingRevenueEth: number | null;
  eligibleCount: { eligible: number; withClient: number; total: number };
  cycleProgress: CycleProgress | null;
  filterEligible: boolean;
  setFilterEligible: (fn: (v: boolean) => boolean) => void;
  currentPeriodProposals: Proposal[];
  getEligibility: (p: { clientId?: number; forVotes: string; quorumVotes: string; status: string }) => 'eligible' | 'pending' | 'ineligible';
  proposalBreakdowns: Map<number, ProposalBreakdownEntry[]>;
}

export function ProposalsTab({
  proposalsByClient, votesByClient, cycleRewardsByClient,
  clientMetadata, clients, pendingRevenueEth,
  eligibleCount, cycleProgress, filterEligible, setFilterEligible,
  currentPeriodProposals, getEligibility, proposalBreakdowns,
}: ProposalsTabProps) {
  const {
    execute: executeProposalUpdate,
    isPending: isProposalPending,
    isConfirming: isProposalConfirming,
    isSuccess: isProposalSuccess,
    canExecute: canExecuteProposal,
    revertReason: proposalRevertReason,
    lastProposalId,
  } = useUpdateProposalRewards({ currentPeriodProposals, getEligibility });

  return (
    <>
      {/* Cycle distribution charts */}
      {(proposalsByClient.length > 0 || votesByClient.length > 0 || cycleRewardsByClient.length > 0) && (
        <div className={styles.chartsRowTriple}>
          {proposalsByClient.length > 0 && (
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>Proposals by Client</div>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={proposalsByClient} margin={{ top: 16, right: 8, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--berry-border, #e5e5e5)" />
                    <XAxis dataKey="name" tick={<ClientTick clientMetadata={clientMetadata} chartData={proposalsByClient} clients={clients} />} interval={0} height={60} />
                    <YAxis tick={{ fontSize: 10 }} width={30} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Proposals" radius={[3, 3, 0, 0]}>
                      {proposalsByClient.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                      <LabelList dataKey="count" position="top" fontSize={9} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {votesByClient.length > 0 && (
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>Votes by Client</div>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={votesByClient} margin={{ top: 16, right: 8, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--berry-border, #e5e5e5)" />
                    <XAxis dataKey="name" tick={<ClientTick clientMetadata={clientMetadata} chartData={votesByClient} clients={clients} />} interval={0} height={60} />
                    <YAxis tick={{ fontSize: 10 }} width={40} />
                    <Tooltip />
                    <Bar dataKey="count" name="Votes" radius={[3, 3, 0, 0]}>
                      {votesByClient.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                      <LabelList dataKey="count" position="top" fontSize={9} formatter={(v: any) => Number(v).toLocaleString()} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {cycleRewardsByClient.length > 0 && (
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>Est. Rewards by Client</div>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cycleRewardsByClient} margin={{ top: 16, right: 8, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--berry-border, #e5e5e5)" />
                    <XAxis dataKey="name" tick={<ClientTick clientMetadata={clientMetadata} chartData={cycleRewardsByClient} clients={clients} />} interval={0} height={60} />
                    <YAxis tick={{ fontSize: 10 }} width={40} />
                    <Tooltip content={<EthTooltip />} />
                    <Bar dataKey="reward" name="Reward" radius={[3, 3, 0, 0]}>
                      {cycleRewardsByClient.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                      <LabelList dataKey="reward" position="top" fontSize={9} formatter={(v: any) => formatEth(Number(v))} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pool info */}
      <div className={styles.poolInfo}>
        <span>
          Pool <span className={styles.poolValue}>
            {pendingRevenueEth != null
              ? `${formatEth(pendingRevenueEth * 0.05)} ETH`
              : '—'}
          </span>
        </span>
        <span>
          Eligible: <span className={styles.poolValue}>
            {eligibleCount.eligible}/{eligibleCount.withClient}
          </span> of {eligibleCount.total}
        </span>
        {cycleProgress && (
          <span className={styles.cycleCountdown}>
            {cycleProgress.canDistribute ? (
              <span className={styles.cycleSettleable}>Ready to distribute</span>
            ) : (
              <>
                <span className={cycleProgress.proposalConditionMet ? styles.cycleMet : styles.cycleUnmet}>
                  {eligibleCount.eligible}/{cycleProgress.numProposalsEnoughForReward} proposals
                </span>
                <span className={styles.cycleSep}>·</span>
                <span className={cycleProgress.timeConditionMet ? styles.cycleMet : styles.cycleUnmet}>
                  {cycleProgress.timeConditionMet
                    ? 'Period met'
                    : cycleProgress.timeRemaining != null
                      ? `${formatDuration(cycleProgress.timeRemaining)} until period`
                      : cycleProgress.qualifyingPendingCount > 0
                        ? `Period passed · ${cycleProgress.qualifyingPendingCount} could qualify`
                        : 'Period passed · none qualify yet'}
                </span>
              </>
            )}
          </span>
        )}
        <button
          className={`${styles.updateButton} ${isProposalPending || isProposalConfirming ? styles.updateButtonPending : ''}`}
          disabled={!canExecuteProposal || isProposalPending || isProposalConfirming || isProposalSuccess}
          onClick={executeProposalUpdate}
          title={
            isProposalSuccess ? 'Proposal rewards updated!'
              : isProposalConfirming ? 'Confirming transaction…'
              : isProposalPending ? 'Waiting for wallet…'
              : !canExecuteProposal ? (proposalRevertReason || 'Conditions not met for reward distribution')
              : lastProposalId != null ? `Update through Prop #${lastProposalId}`
              : 'Update Proposal Rewards'
          }
        >
          {isProposalSuccess ? '✓ Updated'
            : isProposalConfirming ? 'Confirming…'
            : isProposalPending ? 'Pending…'
            : 'Update Proposal Rewards'}
        </button>
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
        const abstainVotes = Number(proposal.abstainVotes ?? 0);
        const quorum = Number(proposal.quorumVotes) || 1;
        const totalVotes = forVotes + againstVotes + abstainVotes;
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

        // Vote bar widths (Camp-style)
        const maxVotes = Math.max(totalVotes, quorum);
        const forWidth = maxVotes > 0 ? (forVotes / maxVotes) * 100 : 0;
        const againstWidth = maxVotes > 0 ? (againstVotes / maxVotes) * 100 : 0;
        const abstainWidth = maxVotes > 0 ? (abstainVotes / maxVotes) * 100 : 0;
        const quorumPosition = maxVotes > 0 ? (quorum / maxVotes) * 100 : 0;

        const hasBreakdown = eligibility === 'eligible' && proposalBreakdowns.has(Number(proposal.id));

        return (
          <div key={proposal.id} className={`${styles.proposalItem} ${hasBreakdown ? styles.proposalItemWithBreakdown : ''}`}>
            {hasBreakdown && (
              <div className={styles.proposalBreakdown}>
                <table className={styles.breakdownTable}>
                  <thead>
                    <tr>
                      <th className={styles.breakdownTh}>Client</th>
                      <th className={styles.breakdownTh}>Votes</th>
                      <th className={`${styles.breakdownTh} ${styles.breakdownThRight}`}>Est. Reward</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposalBreakdowns.get(Number(proposal.id))!.map((entry) => {
                      const totalReward = entry.estimatedProposalReward + entry.estimatedVoteReward;
                      return (
                        <tr key={entry.clientId} className={styles.breakdownRow}>
                          <td className={styles.breakdownTd}>
                            <span
                              className={styles.breakdownClient}
                              style={{ color: CHART_COLORS[entry.clientId % CHART_COLORS.length] }}
                            >
                              {entry.name}
                            </span>
                            {entry.isProposer && (
                              <span className={styles.breakdownTag}>proposer</span>
                            )}
                          </td>
                          <td className={styles.breakdownTd}>
                            {entry.voteCount > 0
                              ? <span className={styles.breakdownVotes}>{entry.voteCount.toLocaleString()}</span>
                              : <span className={styles.breakdownVotesDash}>—</span>
                            }
                          </td>
                          <td className={`${styles.breakdownTd} ${styles.breakdownTdRight}`}>
                            <span className={styles.breakdownReward}>
                              ~{formatEth(totalReward)} ETH
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className={styles.proposalItemContent}>
              {/* Meta line */}
              <div className={styles.proposalMeta}>
                <span className={styles.proposalNumber}>Prop {proposal.id}</span>
                {clientName && (
                  <span
                    className={styles.proposalClientBadge}
                    style={{ color: CHART_COLORS[(proposal.clientId ?? 0) % CHART_COLORS.length] }}
                  >
                    via {clientName}
                  </span>
                )}
              </div>

              {/* Title */}
              <div className={styles.proposalItemTitle}>{proposal.title}</div>

              {/* Vote bar (Camp-style thin bar) */}
              {isActive && totalVotes > 0 && (
                <div className={styles.proposalVoteBar}>
                  {forVotes > 0 && (
                    <div className={styles.voteBarFor} style={{ width: `${forWidth}%` }} />
                  )}
                  {abstainVotes > 0 && (
                    <div className={styles.voteBarAbstain} style={{ width: `${abstainWidth}%` }} />
                  )}
                  {againstVotes > 0 && (
                    <div className={styles.voteBarAgainst} style={{ width: `${againstWidth}%` }} />
                  )}
                  <div className={styles.voteBarQuorum} style={{ left: `${quorumPosition}%` }} />
                </div>
              )}

              {/* Stats row */}
              <div className={styles.proposalStats}>
                {isActive ? (
                  <span className={`${styles.proposalStatusBadge} ${statusClass}`}>
                    Voting
                  </span>
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
                <span className={styles.proposalVoteSummary}>
                  {forVotes.toLocaleString()} for
                  {againstVotes > 0 && <> · {againstVotes.toLocaleString()} against</>}
                  {abstainVotes > 0 && <> · {abstainVotes.toLocaleString()} abstain</>}
                </span>
              </div>
            </div>
          </div>
        );
      })}
      {currentPeriodProposals.length === 0 && (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--berry-text-muted, #8e8e93)', fontSize: 13 }}>
          No proposals in current reward period
        </div>
      )}
    </>
  );
}
