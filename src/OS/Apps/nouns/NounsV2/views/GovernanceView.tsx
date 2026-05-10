/**
 * NounV2 governance — list of proposals with state badges, vote/queue/execute
 * actions on the selected one. Proposable-trait flow lives in a separate view
 * (TraitProposeView) once the descriptor is wired up.
 */

'use client';

import { useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { useV2Proposals, type V2Proposal, type V2ProposalState } from '../hooks/useV2Proposals';
import { useV2Vote, type V2Support } from '../hooks/useV2Vote';
import { useV2GovernorParams } from '../hooks/useV2Treasury';
import { V2TxStatusBanner } from '../components/V2TxStatusBanner';
import { fmtTimestamp, truncateAddr } from '../utils/format';
import { useEnsDataBatch, getEnsFromMap } from '@/OS/hooks/useEnsData';
import styles from './GovernanceView.module.css';

const STATE_TONE: Record<V2ProposalState, string> = {
  Active: styles.toneActive,
  Canceled: styles.toneNeutral,
  Defeated: styles.toneError,
  Succeeded: styles.toneSuccess,
  Queued: styles.toneInfo,
  Expired: styles.toneNeutral,
  Executed: styles.toneSuccess,
};

export function GovernanceView() {
  const { isConnected } = useAccount();
  const proposals = useV2Proposals();
  const params = useV2GovernorParams();
  const vote = useV2Vote();

  const [selectedId, setSelectedId] = useState<bigint | null>(null);
  const [reason, setReason] = useState('');

  const selected = useMemo<V2Proposal | undefined>(
    () => proposals.data?.find((p) => p.id === selectedId) ?? proposals.data?.[0],
    [proposals.data, selectedId]
  );

  const proposers = useMemo(
    () => (proposals.data ?? []).map((p) => p.proposer),
    [proposals.data]
  );
  const { data: ensMap } = useEnsDataBatch(proposers);
  const displayAddr = (addr: string) => getEnsFromMap(ensMap, addr).name ?? truncateAddr(addr);

  const onCast = (support: V2Support) => {
    if (!selected) return;
    vote.castVote(selected.id, support, reason);
  };

  return (
    <div className={styles.view}>
      <aside className={styles.list}>
        <div className={styles.listHeader}>
          <h3 className={styles.listTitle}>Proposals</h3>
          {proposals.data && (
            <span className={styles.listCount}>{proposals.data.length}</span>
          )}
        </div>
        {proposals.isLoading ? (
          <div className={styles.empty}>Loading…</div>
        ) : proposals.error ? (
          <div className={styles.empty}>Failed to load proposals.</div>
        ) : !proposals.data || proposals.data.length === 0 ? (
          <div className={styles.empty}>No proposals yet.</div>
        ) : (
          <ul className={styles.proposalList}>
            {proposals.data.map((p) => (
              <li key={p.id.toString()}>
                <button
                  type="button"
                  className={`${styles.proposalRow} ${
                    (selected?.id ?? proposals.data?.[0].id) === p.id ? styles.proposalActive : ''
                  }`}
                  onClick={() => setSelectedId(p.id)}
                >
                  <span className={styles.rowId}>#{p.id.toString()}</span>
                  <span className={styles.rowTitle}>{p.title}</span>
                  <span className={`${styles.rowState} ${STATE_TONE[p.state]}`}>{p.state}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <main className={styles.detail}>
        {!selected ? (
          <div className={styles.empty}>Select a proposal to view details.</div>
        ) : (
          <>
            <header className={styles.detailHeader}>
              <div className={styles.detailMeta}>
                <span className={`${styles.rowState} ${STATE_TONE[selected.state]}`}>
                  {selected.state}
                </span>
                <span className={styles.detailId}>Proposal #{selected.id.toString()}</span>
              </div>
              <h2 className={styles.detailTitle}>{selected.title}</h2>
              <div className={styles.detailSubmeta}>
                Proposed by {displayAddr(selected.proposer)}
                {selected.eta > BigInt(0) && (
                  <> · executable after {fmtTimestamp(selected.eta)}</>
                )}
              </div>
            </header>

            <div className={styles.voteSummary}>
              <div className={styles.voteCol}>
                <div className={styles.voteLabel}>For</div>
                <div className={`${styles.voteValue} ${styles.voteFor}`}>
                  {selected.forVotes.toString()}
                </div>
              </div>
              <div className={styles.voteCol}>
                <div className={styles.voteLabel}>Against</div>
                <div className={`${styles.voteValue} ${styles.voteAgainst}`}>
                  {selected.againstVotes.toString()}
                </div>
              </div>
              <div className={styles.voteCol}>
                <div className={styles.voteLabel}>Abstain</div>
                <div className={styles.voteValue}>{selected.abstainVotes.toString()}</div>
              </div>
            </div>

            <pre className={styles.description}>{selected.description}</pre>

            {selected.state === 'Active' && (
              <section className={styles.actions}>
                <textarea
                  className={styles.reasonInput}
                  placeholder="Optional reason for your vote…"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                />
                <div className={styles.voteButtons}>
                  <button
                    type="button"
                    className={`${styles.voteButton} ${styles.voteForBtn}`}
                    onClick={() => onCast(1)}
                    disabled={!isConnected || vote.isPending || vote.isConfirming}
                  >
                    Vote For
                  </button>
                  <button
                    type="button"
                    className={`${styles.voteButton} ${styles.voteAgainstBtn}`}
                    onClick={() => onCast(0)}
                    disabled={!isConnected || vote.isPending || vote.isConfirming}
                  >
                    Vote Against
                  </button>
                  <button
                    type="button"
                    className={styles.voteButton}
                    onClick={() => onCast(2)}
                    disabled={!isConnected || vote.isPending || vote.isConfirming}
                  >
                    Abstain
                  </button>
                </div>
              </section>
            )}

            {selected.state === 'Succeeded' && (
              <section className={styles.actions}>
                <button
                  type="button"
                  className={styles.voteButton}
                  onClick={() => vote.queue(selected.id)}
                  disabled={!isConnected || vote.isPending || vote.isConfirming}
                >
                  Queue for execution
                </button>
              </section>
            )}

            {selected.state === 'Queued' && (
              <section className={styles.actions}>
                <button
                  type="button"
                  className={styles.voteButton}
                  onClick={() => vote.execute(selected.id)}
                  disabled={!isConnected || vote.isPending || vote.isConfirming}
                >
                  Execute
                </button>
              </section>
            )}

            <V2TxStatusBanner
              hash={vote.hash ?? null}
              isPending={vote.isPending}
              isConfirming={vote.isConfirming}
              isSuccess={vote.isSuccess}
              error={vote.error}
              onDismiss={vote.reset}
            />

            <footer className={styles.footnote}>
              Voting period: {params.votingPeriodBlocks.toString()} blocks (~12h) · Timelock:{' '}
              {(Number(params.timelockDelaySec) / 3600).toFixed(0)}h · Proposal threshold:{' '}
              {params.proposalThreshold.toString()} NounV2
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
