/**
 * Voters tab — list of all FN token holders + delegates on the left,
 * a Camp-style two-column voter detail panel on the right.
 *
 * The detail panel mirrors Camp's VoterDetailView information flow:
 *   LEFT (65fr) profile header → Nouns owned grid → proposals authored
 *   RIGHT (35fr) stats card (vote distribution + filter) → scrolling activity feed
 *
 * FN doesn't have delegation, delegators, candidates or sponsored proposals,
 * so the simpler Camp left column collapses to just the profile + owned + proposed.
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { useEnsData } from '@/OS/hooks/useEnsData';
import { addressToAvatar } from '@/OS/Apps/nouns/Camp/utils/addressAvatar';
import { MarkdownRenderer } from '@/OS/Apps/nouns/Camp/components/MarkdownRenderer';
import { getSupportColor, getSupportLabel } from '@/OS/Apps/nouns/Camp/types';
import { formatAddress, truncateAddress } from '@/shared/format';
import { useFNVoters, type FNVoterSummary } from '../hooks/useFNVoters';
import { useFNVoter, type FNVoterVote } from '../hooks/useFNVoter';
import { fnAddressLink } from '../contracts';
import styles from './VotersView.module.css';

const openInEtherscan = (addr: string) => {
  if (typeof window !== 'undefined') {
    window.open(fnAddressLink(addr), '_blank', 'noopener,noreferrer');
  }
};

function fmtShortDate(unixSeconds: number): string {
  if (!unixSeconds) return '';
  const d = new Date(unixSeconds * 1000);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(
    'en-US',
    sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' },
  );
}

export function VotersView() {
  const { data: voters, isLoading, error, refetch } = useFNVoters();
  const [selectedAddress, setSelectedAddress] = useState<`0x${string}` | null>(null);
  const [activityFilter, setActivityFilter] = useState<'all' | 'with-reason'>('all');

  const effectiveSelected = selectedAddress ?? voters?.[0]?.address ?? null;
  const { data: detail, isLoading: isDetailLoading } = useFNVoter(effectiveSelected);

  return (
    <div className={styles.view}>
      <div className={styles.body}>
        <aside className={styles.list}>
          {isLoading ? (
            <div className={styles.listEmpty}>Loading…</div>
          ) : error ? (
            <div className={styles.listEmpty}>
              Couldn&apos;t load voters.{' '}
              <button className={styles.linkBtn} onClick={() => refetch()}>Retry</button>
            </div>
          ) : !voters || voters.length === 0 ? (
            <div className={styles.listEmpty}>No voters yet.</div>
          ) : (
            <ul className={styles.voterList}>
              {voters.map((v) => (
                <li key={v.address}>
                  <VoterRow
                    voter={v}
                    active={effectiveSelected === v.address}
                    onSelect={() => setSelectedAddress(v.address)}
                  />
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className={styles.detail}>
          {effectiveSelected === null ? (
            <div className={styles.detailEmpty}>Select a holder to view their profile.</div>
          ) : isDetailLoading || !detail ? (
            <div className={styles.detailEmpty}>Loading profile…</div>
          ) : (
            <VoterDetail
              detail={detail}
              activityFilter={activityFilter}
              onFilterChange={setActivityFilter}
            />
          )}
        </main>
      </div>
    </div>
  );
}

interface VoterRowProps {
  voter: FNVoterSummary;
  active: boolean;
  onSelect: () => void;
}

function VoterRow({ voter, active, onSelect }: VoterRowProps) {
  const { name, avatar } = useEnsData(voter.address);
  const fallback = useMemo(() => addressToAvatar(voter.address), [voter.address]);
  const src = avatar || fallback;
  const displayName = formatAddress(voter.address, name);

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      if (fallback && e.currentTarget.src !== fallback) {
        e.currentTarget.src = fallback;
      }
    },
    [fallback],
  );

  return (
    <button
      type="button"
      className={`${styles.voterRow} ${active ? styles.voterActive : ''}`}
      onClick={onSelect}
    >
      <img src={src} alt="" className={styles.rowAvatar} onError={handleError} />
      <div className={styles.rowMain}>
        <span className={styles.rowName}>{displayName}</span>
        <span className={styles.rowMeta}>
          {voter.owned} owned · {voter.delegatedVotes} vote{voter.delegatedVotes !== 1 ? 's' : ''}
        </span>
      </div>
    </button>
  );
}

function VoterDetail({
  detail,
  activityFilter,
  onFilterChange,
}: {
  detail: NonNullable<ReturnType<typeof useFNVoter>['data']>;
  activityFilter: 'all' | 'with-reason';
  onFilterChange: (f: 'all' | 'with-reason') => void;
}) {
  const { name: ensName, avatar: ensAvatar } = useEnsData(detail.address);
  const fallback = useMemo(() => addressToAvatar(detail.address), [detail.address]);
  const profileAvatar = ensAvatar || fallback;
  const displayName = formatAddress(detail.address, ensName);

  const handleAvatarError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      if (fallback && e.currentTarget.src !== fallback) {
        e.currentTarget.src = fallback;
      }
    },
    [fallback],
  );

  // Vote distribution stats
  const forVotes = detail.votes.filter((v) => v.support === 1).length;
  const againstVotes = detail.votes.filter((v) => v.support === 0).length;
  const abstainVotes = detail.votes.filter((v) => v.support === 2).length;
  const totalVotes = detail.votes.length;
  const votesWithReason = detail.votes.filter((v) => v.reason.trim().length > 0).length;
  const reasonPct = totalVotes > 0 ? Math.round((votesWithReason / totalVotes) * 100) : 0;

  const filteredVotes =
    activityFilter === 'with-reason'
      ? detail.votes.filter((v) => v.reason.trim().length > 0)
      : detail.votes;

  // Delegation surface: only show "Delegating to X" when delegating to someone
  // *other* than self. Self-delegation is the implicit default and isn't worth
  // a line of UI.
  const isSelfDelegated =
    detail.delegatingTo &&
    detail.delegatingTo.toLowerCase() === detail.address.toLowerCase();
  const showDelegatingTo = detail.delegatingTo && !isSelfDelegated;

  return (
    <div className={styles.twoColumn}>
      {/* LEFT COLUMN — profile + owned Nouns + proposals authored */}
      <div className={styles.leftColumn}>
        <header className={styles.profileHeader}>
          <img
            src={profileAvatar}
            alt=""
            className={styles.profileAvatar}
            onError={handleAvatarError}
          />
          <div className={styles.profileMain}>
            <h1 className={styles.profileName}>{displayName}</h1>
            <button
              type="button"
              className={styles.profileAddress}
              onClick={() => openInEtherscan(detail.address)}
              title="View on Etherscan"
            >
              {truncateAddress(detail.address)} ↗
            </button>
          </div>
        </header>

        {showDelegatingTo && detail.delegatingTo && (
          <div className={styles.delegatingTo}>
            <span className={styles.delegatingLabel}>Delegating to </span>
            <AddressChip address={detail.delegatingTo} />
          </div>
        )}

        {detail.delegators.length > 0 && (
          <div className={styles.delegatorsSection}>
            <span className={styles.delegatorsLabel}>
              Delegators ({detail.delegators.length})
            </span>
            <div className={styles.delegatorsList}>
              {detail.delegators.slice(0, 8).map((d) => (
                <AddressChip key={d} address={d} showAvatar />
              ))}
              {detail.delegators.length > 8 && (
                <span className={styles.moreCount}>
                  +{detail.delegators.length - 8} more
                </span>
              )}
            </div>
          </div>
        )}

        {detail.nouns.length > 0 && (
          <div className={styles.nounsSection}>
            <span className={styles.nounsLabel}>
              Food Nouns represented ({detail.nouns.length})
              {detail.owned !== detail.nouns.length && (
                <span className={styles.nounsSub}> · {detail.owned} owned</span>
              )}
            </span>
            <div className={styles.nounsGrid}>
              {[...detail.nouns]
                .sort((a, b) => a.id - b.id)
                .map((noun) => (
                  <div className={styles.nounCard} key={noun.id}>
                    {noun.svg ? (
                      <img
                        src={`data:image/svg+xml;base64,${noun.svg}`}
                        alt={`Food Noun #${noun.id}`}
                        className={styles.nounImage}
                      />
                    ) : (
                      <div className={styles.nounImagePlaceholder} />
                    )}
                    <span className={styles.nounId}>{noun.id}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {detail.proposals.length > 0 && (
          <div className={styles.proposedSection}>
            <span className={styles.proposedLabel}>
              Proposed ({detail.proposals.length})
            </span>
            <div className={styles.proposalsList}>
              {detail.proposals.map((p) => (
                <div key={p.id} className={styles.proposalItem}>
                  <div className={styles.proposalHeader}>
                    <span className={styles.proposalId}>Prop {p.id}</span>
                    {p.state && (
                      <span className={`${styles.proposalStatus} ${stateClass(p.state)}`}>
                        {p.state}
                      </span>
                    )}
                  </div>
                  <div className={styles.proposalTitle}>{p.title || 'Untitled'}</div>
                  <div className={styles.proposalMeta}>
                    <span>{fmtShortDate(p.createdTimestamp)}</span>
                    <span>
                      {p.forVotes.toString()} ↑
                      <span className={styles.metaSep}>·</span>
                      {p.abstainVotes.toString()}
                      <span className={styles.metaSep}>·</span>
                      {p.againstVotes.toString()} ↓
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN — stats card + activity feed */}
      <div className={styles.rightColumn}>
        <div className={styles.statsCard}>
          <div className={styles.statsHeader}>
            {detail.delegatedVotes} food noun{detail.delegatedVotes !== 1 ? 's' : ''} represented
          </div>

          {totalVotes > 0 && (
            <div className={styles.voteBar}>
              <div className={styles.voteBarLabels}>
                <span className={styles.forLabel}>For {forVotes}</span>
                <span className={styles.againstSide}>
                  {abstainVotes > 0 && (
                    <span className={styles.abstainLabel}>Abstain {abstainVotes} · </span>
                  )}
                  <span className={styles.againstLabel}>Against {againstVotes}</span>
                </span>
              </div>
              <div className={styles.voteBarTrack}>
                {forVotes > 0 && (
                  <div
                    className={styles.voteBarFor}
                    style={{ width: `${(forVotes / totalVotes) * 100}%` }}
                  />
                )}
                {abstainVotes > 0 && (
                  <div
                    className={styles.voteBarAbstain}
                    style={{ width: `${(abstainVotes / totalVotes) * 100}%` }}
                  />
                )}
                {againstVotes > 0 && (
                  <div
                    className={styles.voteBarAgainst}
                    style={{ width: `${(againstVotes / totalVotes) * 100}%` }}
                  />
                )}
              </div>
              <div className={styles.voteCount}>
                Voted on {totalVotes} proposal{totalVotes !== 1 ? 's' : ''} (~{reasonPct}% with reason)
              </div>
            </div>
          )}

          <div className={styles.filterRow}>
            <span className={styles.filterLabel}>Show:</span>
            <select
              className={styles.filterSelect}
              value={activityFilter}
              onChange={(e) => onFilterChange(e.target.value as 'all' | 'with-reason')}
            >
              <option value="all">Everything</option>
              <option value="with-reason">With Reason</option>
            </select>
          </div>
        </div>

        <div className={styles.activityFeed}>
          {filteredVotes.length === 0 ? (
            <div className={styles.emptyActivity}>
              {totalVotes === 0 ? 'No voting activity' : 'No votes match this filter'}
            </div>
          ) : (
            filteredVotes.map((v) => (
              <VoteFeedItem key={v.txHash} vote={v} voterName={displayName} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Address chip used in "Delegating to X" and the Delegators list.
 *
 * Resolves ENS for both display name and avatar with a deterministic
 * blockies-style fallback, so the chip degrades gracefully when an ENS avatar
 * URL is dead. `showAvatar` enables the prefix avatar — desirable in the
 * Delegators grid where each chip stands alone, off in the inline "Delegating
 * to X" sentence where a tiny avatar would feel out of place.
 */
function AddressChip({
  address,
  showAvatar = false,
}: {
  address: `0x${string}`;
  showAvatar?: boolean;
}) {
  const { name, avatar } = useEnsData(address);
  const fallback = useMemo(() => addressToAvatar(address), [address]);
  const src = avatar || fallback;
  const displayName = formatAddress(address, name);

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      if (fallback && e.currentTarget.src !== fallback) {
        e.currentTarget.src = fallback;
      }
    },
    [fallback],
  );

  return (
    <button
      type="button"
      className={styles.addressChip}
      onClick={() => openInEtherscan(address)}
      title={`${address} — view on Etherscan`}
    >
      {showAvatar && (
        <img
          src={src}
          alt=""
          className={styles.addressChipAvatar}
          onError={handleError}
        />
      )}
      <span>{displayName}</span>
    </button>
  );
}

function VoteFeedItem({ vote, voterName }: { vote: FNVoterVote; voterName: string }) {
  return (
    <div className={styles.activityItem}>
      <div className={styles.activityHeader}>
        <span className={styles.activityVoter}>{voterName}</span>
        <span
          className={styles.activitySupport}
          style={{ color: getSupportColor(vote.support) }}
        >
          {getSupportLabel(vote.support).toLowerCase()} ({vote.votes.toString()})
        </span>
        <span className={styles.activityProposal}>
          {vote.proposalId}
          {vote.proposalTitle ? `: ${vote.proposalTitle}` : ''}
        </span>
      </div>
      {vote.reason && (
        <MarkdownRenderer content={vote.reason} className={styles.activityReason} />
      )}
    </div>
  );
}

function stateClass(state: string): string {
  const key = state.toLowerCase();
  if (key === 'executed') return styles.statusExecuted;
  if (key === 'active') return styles.statusActive;
  if (key === 'pending') return styles.statusPending;
  if (key === 'queued' || key === 'succeeded') return styles.statusSucceeded;
  if (key === 'defeated' || key === 'cancelled' || key === 'vetoed') return styles.statusDefeated;
  return '';
}
