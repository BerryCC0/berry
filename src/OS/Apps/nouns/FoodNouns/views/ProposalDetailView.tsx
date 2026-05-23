/**
 * Single proposal: vote, queue, execute, view tallies and rationale feed.
 * Mirrors Camp's ProposalDetailView layout:
 *   - Full-width header (id + status pill, title, meta with avatar/date)
 *   - Two columns below:
 *     · Left  — description + on-chain actions (static content)
 *     · Right — user vote status, time remaining, queue/execute,
 *               vote tally with quorum marker, cast-vote box, activity feed
 *
 * The container query collapses the columns to a single stack when the
 * detail pane is narrow (which happens inside the governance two-column
 * layout on smaller windows).
 */

'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBlockNumber } from 'wagmi';
import { formatEther } from 'viem';
import { TxStatusBanner } from '../components/TxStatusBanner';
import { useFNProposal } from '../hooks/useFNProposal';
import { useFNVote, type FNVoteSupport } from '../hooks/useFNVote';
import { useFNPropose } from '../hooks/useFNPropose';
import { fnAddressLink, fnTxLink, FN_CHAIN_ID } from '../contracts';
import { decodeAction, summarizeActions, type DecodedAction } from '../utils/decodeAction';
import { stripTitleFromDescription } from '@/OS/Apps/nouns/Camp/utils/descriptionUtils';
import { MarkdownRenderer } from '@/OS/Apps/nouns/Camp/components/MarkdownRenderer';
import { AddressWithAvatar } from '@/OS/Apps/nouns/Camp/components/AddressWithAvatar';
import type { FNProposalSummary } from '../hooks/useFNProposals';
import type { FNVoteCast } from '../hooks/useFNProposal';
import styles from './ProposalDetailView.module.css';

interface Props {
  proposalId: bigint;
  /** Optional — when present a "back" button is rendered. Embedded panes omit it. */
  onBack?: () => void;
  /** Optional summary from the list view (provides created timestamp + title). */
  summary?: FNProposalSummary;
}

const SUPPORT_LABEL: Record<number, string> = {
  0: 'Against',
  1: 'For',
  2: 'Abstain',
};

const SECONDS_PER_BLOCK = 12;

const openInEtherscan = (addr: string) => {
  if (typeof window !== 'undefined') window.open(fnAddressLink(addr), '_blank', 'noopener,noreferrer');
};

function fmtProposedDate(unixSeconds: number): string {
  if (!unixSeconds) return '';
  const d = new Date(unixSeconds * 1000);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(
    'en-US',
    sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' },
  );
}

function fmtTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'ended';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${Math.max(1, mins)}m`;
}

function fmtAbsoluteTime(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const date = d.toLocaleDateString(
    'en-US',
    sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' },
  );
  return `${date} · ${time}`;
}

export function ProposalDetailView({ proposalId, onBack, summary }: Props) {
  const { address, isConnected } = useAccount();
  const { data, isLoading, error, refetch } = useFNProposal(proposalId);
  const { data: currentBlock } = useBlockNumber({ chainId: FN_CHAIN_ID, watch: true });
  const vote = useFNVote();
  const propose = useFNPropose();

  const [reason, setReason] = useState('');
  const [pendingSupport, setPendingSupport] = useState<FNVoteSupport | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (vote.isSuccess || propose.isSuccess) {
      refetch();
      vote.reset();
      propose.reset();
      setPendingSupport(null);
      setReason('');
      setShowCancelConfirm(false);
    }
  }, [vote.isSuccess, propose.isSuccess, refetch, vote, propose]);

  if (isLoading) {
    return (
      <div className={styles.view}>
        {onBack && <BackBar onBack={onBack} />}
        <div className={styles.empty}>Loading proposal #{proposalId.toString()}…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.view}>
        {onBack && <BackBar onBack={onBack} />}
        <div className={styles.empty}>Couldn&apos;t load proposal #{proposalId.toString()}.</div>
      </div>
    );
  }

  // Camp-style quorum-anchored vote bar:
  //   leftExtent  = max(forVotes, quorum) — pushes the quorum marker into the
  //                 bar even when forVotes < quorum
  //   rightExtent = abstainVotes + againstVotes
  //   totalScale  = leftExtent + rightExtent
  // When forVotes < quorum a gap is rendered between the For block and the
  // quorum marker showing how far short of quorum we are.
  const forN = Number(data.forVotes);
  const againstN = Number(data.againstVotes);
  const abstainN = Number(data.abstainVotes);
  const quorumN = Number(data.quorumVotes) || 1;

  const leftExtent = Math.max(forN, quorumN);
  const rightExtent = abstainN + againstN;
  const totalScale = leftExtent + rightExtent;

  const forWidth = totalScale > 0 ? (forN / totalScale) * 100 : 0;
  const quorumPos = totalScale > 0 ? (quorumN / totalScale) * 100 : 50;
  const abstainWidth = totalScale > 0 ? (abstainN / totalScale) * 100 : 0;
  const againstWidth = totalScale > 0 ? (againstN / totalScale) * 100 : 0;
  const gapWidth = forN < quorumN ? Math.max(0, quorumPos - forWidth) : 0;
  const quorumMet = data.forVotes >= data.quorumVotes;

  // Partition votes for per-block rendering. Each voter is a flex item sized
  // by vote weight inside its section — gives an at-a-glance read on
  // concentration (one whale vs many small voters).
  const forVoters = data.votes
    .filter((v) => v.support === 1)
    .sort((a, b) => Number(b.votes) - Number(a.votes));
  const abstainVoters = data.votes.filter((v) => v.support === 2);
  const againstVoters = data.votes
    .filter((v) => v.support === 0)
    .sort((a, b) => Number(b.votes) - Number(a.votes));

  const canVote = data.state === 'Active' && isConnected && !data.userReceipt?.hasVoted;
  const canQueue = data.state === 'Succeeded';
  // Execute gating mirrors the Compound timelock's own requires:
  //   require(now >= eta)                  — must clear the timelock delay
  //   require(now <= eta + GRACE_PERIOD)   — must not be stale
  // The governor's `state()` already flips to 'Expired' past the grace
  // window, so checking `state === 'Queued'` covers the upper bound. We only
  // need to additionally enforce the lower bound (eta passed) here.
  const isQueued = data.state === 'Queued';
  const etaSecs = Number(data.eta);
  const etaPassed = etaSecs > 0 && Math.floor(Date.now() / 1000) >= etaSecs;
  const canExecute = isQueued && etaPassed;
  const secsUntilExecutable = Math.max(0, etaSecs - Math.floor(Date.now() / 1000));
  const hasVoted = !!data.userReceipt?.hasVoted;

  // Proposer-only: cancel is permitted by the V1 governor while the proposal
  // is not yet executed/canceled/expired. We surface it on terminal states
  // too as a no-op, so gate on lifecycle states where it actually matters.
  const isProposer =
    !!address && address.toLowerCase() === data.proposer.toLowerCase();
  const cancelableStates: typeof data.state[] = ['Pending', 'Active', 'Succeeded', 'Queued'];
  const canCancel = isProposer && cancelableStates.includes(data.state);

  // Time-remaining indicator — modeled on Camp's pattern.
  const now = Math.floor(Date.now() / 1000);
  const cb = currentBlock ? Number(currentBlock) : 0;
  let timeInfo: { prefix: string; seconds: number; targetTs: number } | null = null;
  if (cb > 0) {
    if (data.state === 'Pending') {
      const blocksUntilStart = Number(data.startBlock) - cb;
      const secs = blocksUntilStart * SECONDS_PER_BLOCK;
      if (secs > 0) timeInfo = { prefix: 'Voting starts in', seconds: secs, targetTs: now + secs };
    } else if (data.state === 'Active') {
      const blocksUntilEnd = Number(data.endBlock) - cb;
      const secs = blocksUntilEnd * SECONDS_PER_BLOCK;
      if (secs > 0) timeInfo = { prefix: 'Voting ends in', seconds: secs, targetTs: now + secs };
    } else if (data.state === 'Queued' && data.eta > BigInt(0)) {
      const secs = Number(data.eta) - now;
      if (secs > 0) timeInfo = { prefix: 'Executable in', seconds: secs, targetTs: Number(data.eta) };
    }
  }

  const onVote = (support: FNVoteSupport) => {
    setPendingSupport(support);
    vote.castVote(proposalId, support, reason);
  };

  const title = summary?.title || firstLine(data.description);
  const proposedDate = fmtProposedDate(summary?.createdTimestamp ?? 0);

  return (
    <div className={styles.view}>
      {onBack && <BackBar onBack={onBack} />}

      {/* Header — full width across both columns */}
      <div className={styles.header}>
        <span className={styles.id}>Proposal #{proposalId.toString()}</span>
        <span className={`${styles.status} ${styles[data.state.toLowerCase()] ?? ''}`}>
          {data.state}
        </span>
      </div>

      <h1 className={styles.title}>{title}</h1>

      <div className={styles.proposalMeta}>
        {proposedDate ? (
          <>
            <span className={styles.metaDate}>Proposed {proposedDate}</span>
            <span className={styles.metaSeparator}>by</span>
          </>
        ) : (
          <span className={styles.metaSeparator}>Proposed by</span>
        )}
        <AddressWithAvatar address={data.proposer} onClick={() => openInEtherscan(data.proposer)} />
      </div>

      <div className={styles.columns}>
        {/* Left column — what the proposal does (static content) */}
        <div className={styles.leftColumn}>
          {summarizeActions(data.actions) && (
            <div className={styles.txSummary}>
              {summarizeActions(data.actions)!.lines.map((line, i) => (
                <div className={styles.txSummaryItem} key={i}>{line}</div>
              ))}
            </div>
          )}

          <section className={styles.descriptionSection}>
            <h3 className={styles.sectionTitle}>Description</h3>
            <div className={styles.description}>
              {data.description ? (
                <MarkdownRenderer
                  content={stripTitleFromDescription(data.description, title)}
                />
              ) : (
                <div className={styles.empty}>No description.</div>
              )}
            </div>
          </section>

        </div>

        {/*
         * Right column — ordered top-to-bottom:
         *   1. Proposer options (cancel)
         *   2. Queue / Execute
         *   3. Time counter
         *   4. Transactions
         *   5. User vote interaction (cast box OR vote receipt — mutually exclusive)
         *   6. Quorum bar
         *   7. Activity feed
         *
         * Actionable controls cluster at the top so the most relevant call-to-
         * action for the proposal's current lifecycle stage is always visible
         * without scrolling.
         */}
        <div className={styles.rightColumn}>
          {/* 1. Proposer options */}
          {canCancel && (
            <section className={styles.proposerActions}>
              <span className={styles.proposerActionsLabel}>Proposer</span>
              {!showCancelConfirm ? (
                <button
                  type="button"
                  className={styles.cancelProposalButton}
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={propose.isPending || propose.isConfirming}
                >
                  Cancel Proposal
                </button>
              ) : (
                <div className={styles.confirmCancel}>
                  <span className={styles.confirmText}>Are you sure?</span>
                  <button
                    type="button"
                    className={styles.confirmYes}
                    onClick={() => propose.cancel(proposalId)}
                    disabled={propose.isPending || propose.isConfirming}
                  >
                    {propose.isPending || propose.isConfirming ? 'Cancelling…' : 'Yes, Cancel'}
                  </button>
                  <button
                    type="button"
                    className={styles.confirmNo}
                    onClick={() => setShowCancelConfirm(false)}
                    disabled={propose.isPending || propose.isConfirming}
                  >
                    No
                  </button>
                </div>
              )}
            </section>
          )}

          {/*
           * 2. Queue / Execute  +  Time counter — same horizontal row.
           *
           * Each child preserves its own render condition (button → canQueue ||
           * isQueued, time counter → timeInfo), so the row's contents shift by
           * lifecycle stage:
           *   - Pending / Active    → time counter only
           *   - Succeeded           → queue button only
           *   - Queued, pre-eta     → execute button (disabled, with countdown)
           *                            + time counter (with absolute target)
           *   - Queued, post-eta    → execute button (enabled) only
           *                            (timeInfo unset because secs ≤ 0)
           */}
          {((canQueue || isQueued) || timeInfo) && (
            <section className={styles.actionSection}>
              <div className={styles.actionRow}>
                {timeInfo && (
                  <div className={styles.timeRemaining}>
                    <span className={styles.timeIcon}>⏱</span>
                    <div className={styles.timeText}>
                      <div>{`${timeInfo.prefix} ${fmtTimeRemaining(timeInfo.seconds)}`}</div>
                      <div className={styles.timeAbsolute}>{fmtAbsoluteTime(timeInfo.targetTs)}</div>
                    </div>
                  </div>
                )}
                {canQueue && (
                  <button
                    type="button"
                    className={styles.actionButton}
                    disabled={!isConnected || propose.isPending || propose.isConfirming}
                    onClick={() => propose.queue(proposalId)}
                  >
                    {propose.isPending || propose.isConfirming ? 'Queuing…' : 'Queue for execution'}
                  </button>
                )}
                {isQueued && (
                  <button
                    type="button"
                    className={styles.actionButton}
                    disabled={
                      !isConnected ||
                      !canExecute ||
                      propose.isPending ||
                      propose.isConfirming
                    }
                    onClick={() => propose.execute(proposalId)}
                    title={
                      !canExecute
                        ? 'Timelock delay has not elapsed yet'
                        : undefined
                    }
                  >
                    {propose.isPending || propose.isConfirming
                      ? 'Executing…'
                      : canExecute
                      ? 'Execute proposal'
                      : `Executable in ${fmtTimeRemaining(secsUntilExecutable)}`}
                  </button>
                )}
              </div>
              {(canQueue || isQueued) && !isConnected && (
                <span className={styles.help}>Connect a wallet to continue.</span>
              )}
              {(canQueue || isQueued) && (
                <TxStatusBanner
                  hash={propose.hash ?? null}
                  isPending={propose.isPending}
                  isConfirming={propose.isConfirming}
                  isSuccess={propose.isSuccess}
                  error={propose.error}
                  onDismiss={propose.reset}
                  successMessage="Action confirmed."
                />
              )}
            </section>
          )}

          {/* 3. Transactions */}{/* (slot 2 absorbed the old slot 3 time counter) */}
          {data.actions.length > 0 && (
            <section className={styles.actionsListSection}>
              <h3 className={styles.sectionTitle}>Transactions ({data.actions.length})</h3>
              <div className={styles.actionsList}>
                {data.actions.map((a, i) => (
                  <ActionRow key={i} index={i} decoded={decodeAction(a)} />
                ))}
              </div>
            </section>
          )}

          {/* 5a. User vote receipt — "how the user voted" */}
          {hasVoted && data.userReceipt && (
            <div className={styles.userVoteStatus}>
              <span className={styles.userVoteText}>You voted </span>
              <span
                className={
                  data.userReceipt.support === 1 ? styles.countFor :
                  data.userReceipt.support === 0 ? styles.countAgainst :
                  styles.countAbstain
                }
              >
                {(SUPPORT_LABEL[data.userReceipt.support] ?? '—').toUpperCase()}
              </span>
              <span className={styles.userVoteText}>
                {' '}with <strong>{data.userReceipt.votes.toString()}</strong> votes
              </span>
            </div>
          )}

          {/* 5b. Cast your vote — mutually exclusive with the receipt above:
                 the receipt only renders when hasVoted, this only when
                 canVote === true (Active + connected + not-yet-voted). */}
          {canVote && (
            <section className={styles.voteSection}>
              <h3 className={styles.sectionTitle}>Cast your vote</h3>
              <textarea
                className={styles.reasonInput}
                placeholder="Optional rationale (recorded on-chain)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                disabled={vote.isPending || vote.isConfirming}
              />
              <div className={styles.voteButtons}>
                <button
                  type="button"
                  className={`${styles.voteBtn} ${styles.voteFor}`}
                  disabled={vote.isPending || vote.isConfirming}
                  onClick={() => onVote(1)}
                >
                  {vote.isPending && pendingSupport === 1 ? 'Submitting…' : 'For'}
                </button>
                <button
                  type="button"
                  className={`${styles.voteBtn} ${styles.voteAgainst}`}
                  disabled={vote.isPending || vote.isConfirming}
                  onClick={() => onVote(0)}
                >
                  {vote.isPending && pendingSupport === 0 ? 'Submitting…' : 'Against'}
                </button>
                <button
                  type="button"
                  className={`${styles.voteBtn} ${styles.voteAbstain}`}
                  disabled={vote.isPending || vote.isConfirming}
                  onClick={() => onVote(2)}
                >
                  {vote.isPending && pendingSupport === 2 ? 'Submitting…' : 'Abstain'}
                </button>
              </div>
              <p className={styles.help}>
                V1 governor: voting costs gas (no refund). Make sure you&apos;re comfortable with the gas before submitting.
              </p>
              <TxStatusBanner
                hash={vote.hash ?? null}
                isPending={vote.isPending}
                isConfirming={vote.isConfirming}
                isSuccess={vote.isSuccess}
                error={vote.error}
                onDismiss={vote.reset}
                successMessage="Vote recorded."
              />
            </section>
          )}

          {/* 6. Quorum bar */}
          <section className={styles.tally}>
            <div className={styles.tallyLabels}>
              <span className={styles.countFor}>For {data.forVotes.toString()}</span>
              <span className={styles.tallyRight}>
                {data.abstainVotes > BigInt(0) && (
                  <span className={styles.countAbstain}>Abstain {data.abstainVotes.toString()}</span>
                )}
                {data.abstainVotes > BigInt(0) && data.againstVotes > BigInt(0) && (
                  <span className={styles.labelSep}>·</span>
                )}
                {data.againstVotes > BigInt(0) && (
                  <span className={styles.countAgainst}>Against {data.againstVotes.toString()}</span>
                )}
              </span>
            </div>

            <div className={styles.tallyBar}>
              <div className={styles.segFor} style={{ width: `${forWidth}%` }}>
                {forVoters.map((v) => (
                  <div
                    key={`for-${v.txHash}`}
                    className={styles.voteBlock}
                    style={{ flex: Number(v.votes) }}
                    title={`${v.votes.toString()} For`}
                  />
                ))}
              </div>
              {gapWidth > 0 && <div className={styles.quorumGap} style={{ width: `${gapWidth}%` }} />}
              {data.quorumVotes > BigInt(0) && (
                <div className={styles.quorumMarker} style={{ left: `${quorumPos}%` }} />
              )}
              {abstainWidth > 0 && (
                <div className={styles.segAbstain} style={{ width: `${abstainWidth}%` }}>
                  {abstainVoters.map((v) => (
                    <div
                      key={`abstain-${v.txHash}`}
                      className={styles.voteBlock}
                      style={{ flex: Number(v.votes) }}
                      title={`${v.votes.toString()} Abstain`}
                    />
                  ))}
                </div>
              )}
              {againstWidth > 0 && (
                <div className={styles.segAgainst} style={{ width: `${againstWidth}%` }}>
                  {againstVoters.map((v) => (
                    <div
                      key={`against-${v.txHash}`}
                      className={styles.voteBlock}
                      style={{ flex: Number(v.votes) }}
                      title={`${v.votes.toString()} Against`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className={styles.quorumRow}>
              <span className={styles.quorumLabel}>
                Quorum {data.quorumVotes.toString()} {quorumMet ? '(met)' : ''}
              </span>
              <span className={styles.thresholdLabel}>
                Threshold {data.proposalThreshold.toString()}
              </span>
            </div>
          </section>

          {/* 7. Activity */}
          <section className={styles.feedSection}>
            <h3 className={styles.sectionTitle}>Activity ({data.votes.length})</h3>
            {data.votes.length === 0 ? (
              <div className={styles.empty}>No votes yet.</div>
            ) : (
              <div className={styles.feedList}>
                {data.votes.map((v) => (
                  <VoteFeedItem key={v.txHash} vote={v} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function VoteFeedItem({ vote }: { vote: FNVoteCast }) {
  const supportClass =
    vote.support === 1 ? styles.countFor : vote.support === 0 ? styles.countAgainst : styles.countAbstain;
  const dateStr = vote.timestamp > 0
    ? new Date(vote.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';
  const voteCount = Number(vote.votes);

  return (
    <div className={styles.feedItem}>
      <div className={styles.feedHeader}>
        <div className={styles.feedHeaderLeft}>
          <AddressWithAvatar address={vote.voter} onClick={() => openInEtherscan(vote.voter)} />
          <span className={styles.feedVotes}>
            {vote.votes.toString()} vote{voteCount !== 1 ? 's' : ''}
          </span>
          <span className={`${styles.feedSupport} ${supportClass}`}>
            {SUPPORT_LABEL[vote.support] ?? '—'}
          </span>
        </div>
        <div className={styles.feedHeaderRight}>
          {dateStr && <span className={styles.feedDate}>{dateStr}</span>}
          <a
            href={fnTxLink(vote.txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.feedLink}
          >
            ↗
          </a>
        </div>
      </div>
      {vote.reason && <MarkdownRenderer content={vote.reason} className={styles.feedReason} />}
    </div>
  );
}

function ActionRow({ index, decoded }: { index: number; decoded: DecodedAction }) {
  if (decoded.kind === 'eth-transfer') {
    return (
      <div className={styles.actionItem}>
        <div className={styles.actionHeader}>
          <span className={styles.actionIndex}>#{index + 1}</span>
          <span className={styles.actionVerb}>Transfer</span>
          <span className={styles.actionValue}>Ξ {decoded.valueEth}</span>
          <span className={styles.actionVerb}>to</span>
          <AddressWithAvatar
            address={decoded.recipient}
            onClick={() => openInEtherscan(decoded.recipient)}
          />
        </div>
      </div>
    );
  }

  if (decoded.kind === 'contract-call') {
    return (
      <div className={styles.actionItem}>
        <div className={styles.actionHeader}>
          <span className={styles.actionIndex}>#{index + 1}</span>
          <span className={styles.actionVerb}>Call</span>
          <code className={styles.actionSig}>{decoded.signature}</code>
          <span className={styles.actionVerb}>on</span>
          <AddressWithAvatar
            address={decoded.target}
            onClick={() => openInEtherscan(decoded.target)}
          />
          {decoded.valueWei > BigInt(0) && (
            <span className={styles.actionValue}>with Ξ {formatEther(decoded.valueWei)}</span>
          )}
        </div>
        {decoded.calldata && decoded.calldata !== '0x' && (
          <code className={styles.actionCalldata}>{decoded.calldata}</code>
        )}
      </div>
    );
  }

  // raw-call
  return (
    <div className={styles.actionItem}>
      <div className={styles.actionHeader}>
        <span className={styles.actionIndex}>#{index + 1}</span>
        <span className={styles.actionVerb}>Raw call to</span>
        <AddressWithAvatar
          address={decoded.target}
          onClick={() => openInEtherscan(decoded.target)}
        />
        {decoded.valueWei > BigInt(0) && (
          <span className={styles.actionValue}>with Ξ {formatEther(decoded.valueWei)}</span>
        )}
      </div>
      {decoded.calldata && decoded.calldata !== '0x' && (
        <code className={styles.actionCalldata}>{decoded.calldata}</code>
      )}
    </div>
  );
}

function firstLine(description: string): string {
  return description.trim().split('\n')[0]?.replace(/^#+\s*/, '') || 'Untitled proposal';
}

function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" className={styles.backBtn} onClick={onBack}>
      ← Back to proposals
    </button>
  );
}
