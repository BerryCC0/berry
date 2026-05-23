/**
 * Governance hub — V2-style two-column layout.
 * Left: scrollable list of proposals.
 * Right: selected proposal detail with markdown description.
 *
 * "New Proposal" still takes over the whole view (creation is a focused task).
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { useFNProposals } from '../hooks/useFNProposals';
import { useFNGovernanceParams } from '../hooks/useFNPropose';
import { useFNHoldings } from '../hooks/useFNHoldings';
import { ProposalDetailView } from './ProposalDetailView';
import { ProposeView } from './ProposeView';
import { useEnsData } from '@/OS/hooks/useEnsData';
import { addressToAvatar } from '@/OS/Apps/nouns/Camp/utils/addressAvatar';
import { formatAddress } from '@/shared/format';
import { fmtShortDate } from '../utils/format';
import type { FNProposalSummary } from '../hooks/useFNProposals';
import type { FNProposalStateName } from '../abis/governorAbi';
import styles from './GovernanceView.module.css';

type Mode = { kind: 'browse' } | { kind: 'propose' };

const STATE_TONE: Record<FNProposalStateName | 'Unknown', string> = {
  Pending: 'pending',
  Active: 'active',
  Canceled: 'inert',
  Defeated: 'failed',
  Succeeded: 'success',
  Queued: 'queued',
  Expired: 'inert',
  Executed: 'success',
  Vetoed: 'failed',
  Unknown: 'inert',
};

export function GovernanceView() {
  const [mode, setMode] = useState<Mode>({ kind: 'browse' });
  const [selectedId, setSelectedId] = useState<bigint | null>(null);

  const { address, isConnected } = useAccount();
  const { data: proposals, isLoading, error, refetch } = useFNProposals();
  const { proposalThreshold } = useFNGovernanceParams();
  const { data: holdings } = useFNHoldings(address);

  const goBrowse = useCallback(() => setMode({ kind: 'browse' }), []);
  const goPropose = useCallback(() => setMode({ kind: 'propose' }), []);
  const handleCreated = useCallback((id: bigint) => {
    setSelectedId(id);
    setMode({ kind: 'browse' });
  }, []);

  if (mode.kind === 'propose') {
    return (
      <ProposeView
        onBack={goBrowse}
        onCreated={handleCreated}
        proposalThreshold={proposalThreshold}
        userVotes={holdings?.votes ?? BigInt(0)}
      />
    );
  }

  const canPropose = isConnected && (holdings?.votes ?? BigInt(0)) >= proposalThreshold && proposalThreshold > BigInt(0);

  // Auto-select first proposal so something is always shown on the right.
  const effectiveSelectedId = selectedId ?? proposals?.[0]?.id ?? null;

  return (
    <div className={styles.view}>
      <div className={styles.headerRow}>
        <div className={styles.statRow}>
          <span className={styles.stat}>
            <span className={styles.statLabel}>Threshold</span>
            <span className={styles.statValue}>{proposalThreshold.toString()} votes</span>
          </span>
          {isConnected && (
            <span className={styles.stat}>
              <span className={styles.statLabel}>Your votes</span>
              <span className={styles.statValue}>{holdings?.votes.toString() ?? '0'}</span>
            </span>
          )}
        </div>
        <button
          type="button"
          className={styles.newButton}
          disabled={!isConnected}
          title={!isConnected ? 'Connect a wallet first' : !canPropose ? 'You need at least the proposal threshold' : ''}
          onClick={goPropose}
        >
          New Proposal
        </button>
      </div>

      <div className={styles.body}>
        <aside className={styles.list}>
          {isLoading ? (
            <div className={styles.listEmpty}>Loading…</div>
          ) : error ? (
            <div className={styles.listEmpty}>
              Couldn&apos;t load proposals.{' '}
              <button className={styles.linkBtn} onClick={() => refetch()}>Retry</button>
            </div>
          ) : !proposals || proposals.length === 0 ? (
            <div className={styles.listEmpty}>No proposals yet.</div>
          ) : (
            <ul className={styles.proposalList}>
              {proposals.map((p) => (
                <li key={p.id.toString()}>
                  <ProposalRow
                    proposal={p}
                    active={effectiveSelectedId === p.id}
                    onSelect={() => setSelectedId(p.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className={styles.detail}>
          {effectiveSelectedId === null ? (
            <div className={styles.detailEmpty}>Select a proposal to view details.</div>
          ) : (
            <ProposalDetailView
              proposalId={effectiveSelectedId}
              summary={proposals?.find((p) => p.id === effectiveSelectedId)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

interface ProposalRowProps {
  proposal: FNProposalSummary;
  active: boolean;
  onSelect: () => void;
}

function ProposalRow({ proposal, active, onSelect }: ProposalRowProps) {
  const isActive = proposal.state === 'Active';
  const total = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
  const forPct = total > BigInt(0) ? Number((proposal.forVotes * BigInt(100)) / total) : 0;
  const againstPct = total > BigInt(0) ? Number((proposal.againstVotes * BigInt(100)) / total) : 0;
  const abstainPct = total > BigInt(0) ? Number((proposal.abstainVotes * BigInt(100)) / total) : 0;
  const submittedDate = proposal.createdTimestamp > 0 ? fmtShortDate(proposal.createdTimestamp) : '';

  return (
    <button
      type="button"
      className={`${styles.proposalRow} ${active ? styles.proposalActive : ''}`}
      onClick={onSelect}
    >
      <div className={styles.proposalMeta}>
        Prop {proposal.id.toString()} by{' '}
        <span className={styles.proposer}>
          <ProposerENS address={proposal.proposer} />
        </span>
      </div>

      <div className={styles.proposalTitle}>{proposal.title}</div>

      {isActive && total > BigInt(0) && (
        <div className={styles.voteBar}>
          <div className={styles.segFor} style={{ width: `${forPct}%` }} />
          {abstainPct > 0 && <div className={styles.segAbstain} style={{ width: `${abstainPct}%` }} />}
          {againstPct > 0 && <div className={styles.segAgainst} style={{ width: `${againstPct}%` }} />}
        </div>
      )}

      <div className={styles.proposalStats}>
        {isActive ? (
          <>
            <span className={styles.voteCount}>{proposal.forVotes.toString()} ↑</span>
            {proposal.abstainVotes > BigInt(0) && (
              <span className={styles.voteCount}>{proposal.abstainVotes.toString()}</span>
            )}
            {proposal.againstVotes > BigInt(0) && (
              <span className={styles.voteCount}>{proposal.againstVotes.toString()} ↓</span>
            )}
          </>
        ) : (
          submittedDate && <span className={styles.submittedDate}>{submittedDate}</span>
        )}
        <span className={`${styles.statePill} ${styles[STATE_TONE[proposal.state] ?? 'inert']} ${styles.rightAligned}`}>
          {proposal.state}
        </span>
      </div>
    </button>
  );
}

function ProposerENS({ address }: { address: string }) {
  const { name: ensName, avatar: ensAvatar } = useEnsData(address);
  const fallback = useMemo(() => addressToAvatar(address), [address]);
  const src = ensAvatar || fallback;

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      if (fallback && e.currentTarget.src !== fallback) {
        e.currentTarget.src = fallback;
      }
    },
    [fallback],
  );

  return (
    <span className={styles.ensInline}>
      <img src={src} alt="" className={styles.ensAvatar} onError={handleError} />
      {formatAddress(address, ensName)}
    </span>
  );
}
