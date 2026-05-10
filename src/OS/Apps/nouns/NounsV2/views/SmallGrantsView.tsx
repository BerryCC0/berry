/**
 * Small Grants — lightweight grant pot governed by V1 mainnet Nouns holders.
 * Shipped alongside V2 in the same handoff bundle. Voting power = V1 NounsToken.
 *
 * No quorum: a single FOR vote passes if no AGAINST. 12h vote, 12h timelock.
 */

'use client';

import { useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { useSGProposals, type SGProposal } from '../hooks/useSGProposals';
import { useSGVote } from '../hooks/useSGVote';
import { useSGTreasuryBalance } from '../hooks/useSGTreasury';
import { V2TxStatusBanner } from '../components/V2TxStatusBanner';
import { SG_ADDRESSES, v2AddressLink } from '../contracts';
import { fmtEth, fmtTimestamp, truncateAddr } from '../utils/format';
import type { V2Support } from '../hooks/useV2Vote';
import type { V2ProposalState } from '../hooks/useV2Proposals';
import { useEnsDataBatch, getEnsFromMap } from '@/OS/hooks/useEnsData';
import sgStyles from './SmallGrantsView.module.css';
import gov from './GovernanceView.module.css';

const STATE_TONE: Record<V2ProposalState, string> = {
  Active: gov.toneActive,
  Canceled: gov.toneNeutral,
  Defeated: gov.toneError,
  Succeeded: gov.toneSuccess,
  Queued: gov.toneInfo,
  Expired: gov.toneNeutral,
  Executed: gov.toneSuccess,
};

export function SmallGrantsView() {
  const { isConnected } = useAccount();
  const proposals = useSGProposals();
  const vote = useSGVote();
  const balance = useSGTreasuryBalance();

  const [selectedId, setSelectedId] = useState<bigint | null>(null);
  const [reason, setReason] = useState('');

  const selected = useMemo<SGProposal | undefined>(
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
    <div className={sgStyles.view}>
      <div className={sgStyles.header}>
        <div className={sgStyles.headerCol}>
          <div className={sgStyles.heroLabel}>Pot balance</div>
          <div className={sgStyles.heroValue}>
            Ξ {balance.isLoading ? '…' : fmtEth(balance.data ?? BigInt(0))}
          </div>
        </div>
        <div className={sgStyles.headerCol}>
          <div className={sgStyles.heroLabel}>Voting source</div>
          <div className={sgStyles.heroValueSmall}>Mainnet NounsToken (V1)</div>
          <a
            href={v2AddressLink(SG_ADDRESSES.v1Token)}
            target="_blank"
            rel="noopener noreferrer"
            className={sgStyles.heroLink}
          >
            {truncateAddr(SG_ADDRESSES.v1Token)} ↗
          </a>
        </div>
        <div className={sgStyles.headerCol}>
          <div className={sgStyles.heroLabel}>Rules</div>
          <ul className={sgStyles.rules}>
            <li>No quorum — 1 FOR passes if no AGAINST</li>
            <li>12h vote · 12h timelock</li>
            <li>Max 10 ops per proposal</li>
          </ul>
        </div>
      </div>

      <div className={gov.view}>
        <aside className={gov.list}>
          <div className={gov.listHeader}>
            <h3 className={gov.listTitle}>Grant proposals</h3>
            {proposals.data && <span className={gov.listCount}>{proposals.data.length}</span>}
          </div>
          {proposals.isLoading ? (
            <div className={gov.empty}>Loading…</div>
          ) : !proposals.data || proposals.data.length === 0 ? (
            <div className={gov.empty}>No proposals yet.</div>
          ) : (
            <ul className={gov.proposalList}>
              {proposals.data.map((p) => (
                <li key={p.id.toString()}>
                  <button
                    type="button"
                    className={`${gov.proposalRow} ${
                      (selected?.id ?? proposals.data?.[0].id) === p.id ? gov.proposalActive : ''
                    }`}
                    onClick={() => setSelectedId(p.id)}
                  >
                    <span className={gov.rowId}>#{p.id.toString()}</span>
                    <span className={gov.rowTitle}>{p.title}</span>
                    <span className={`${gov.rowState} ${STATE_TONE[p.state]}`}>{p.state}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className={gov.detail}>
          {!selected ? (
            <div className={gov.empty}>Select a grant to view details.</div>
          ) : (
            <>
              <header className={gov.detailHeader}>
                <div className={gov.detailMeta}>
                  <span className={`${gov.rowState} ${STATE_TONE[selected.state]}`}>
                    {selected.state}
                  </span>
                  <span className={gov.detailId}>Grant #{selected.id.toString()}</span>
                </div>
                <h2 className={gov.detailTitle}>{selected.title}</h2>
                <div className={gov.detailSubmeta}>
                  Proposed by {displayAddr(selected.proposer)}
                  {selected.eta > BigInt(0) && <> · executable after {fmtTimestamp(selected.eta)}</>}
                </div>
              </header>

              <div className={gov.voteSummary}>
                <div className={gov.voteCol}>
                  <div className={gov.voteLabel}>For</div>
                  <div className={`${gov.voteValue} ${gov.voteFor}`}>
                    {selected.forVotes.toString()}
                  </div>
                </div>
                <div className={gov.voteCol}>
                  <div className={gov.voteLabel}>Against</div>
                  <div className={`${gov.voteValue} ${gov.voteAgainst}`}>
                    {selected.againstVotes.toString()}
                  </div>
                </div>
                <div className={gov.voteCol}>
                  <div className={gov.voteLabel}>Abstain</div>
                  <div className={gov.voteValue}>{selected.abstainVotes.toString()}</div>
                </div>
              </div>

              <pre className={gov.description}>{selected.description}</pre>

              {selected.state === 'Active' && (
                <section className={gov.actions}>
                  <textarea
                    className={gov.reasonInput}
                    placeholder="Optional reason for your vote…"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                  />
                  <div className={gov.voteButtons}>
                    <button
                      type="button"
                      className={`${gov.voteButton} ${gov.voteForBtn}`}
                      onClick={() => onCast(1)}
                      disabled={!isConnected || vote.isPending || vote.isConfirming}
                    >
                      Vote For
                    </button>
                    <button
                      type="button"
                      className={`${gov.voteButton} ${gov.voteAgainstBtn}`}
                      onClick={() => onCast(0)}
                      disabled={!isConnected || vote.isPending || vote.isConfirming}
                    >
                      Vote Against
                    </button>
                    <button
                      type="button"
                      className={gov.voteButton}
                      onClick={() => onCast(2)}
                      disabled={!isConnected || vote.isPending || vote.isConfirming}
                    >
                      Abstain
                    </button>
                  </div>
                </section>
              )}

              {selected.state === 'Succeeded' && (
                <section className={gov.actions}>
                  <button
                    type="button"
                    className={gov.voteButton}
                    onClick={() => vote.queue(selected.id)}
                    disabled={!isConnected || vote.isPending || vote.isConfirming}
                  >
                    Queue for execution
                  </button>
                </section>
              )}

              {selected.state === 'Queued' && (
                <section className={gov.actions}>
                  <button
                    type="button"
                    className={gov.voteButton}
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
            </>
          )}
        </main>
      </div>
    </div>
  );
}
