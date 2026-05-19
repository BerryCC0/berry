/**
 * VoterHoverCard
 * Mini-profile shown inside a HoverPopover over voter address links.
 * Renders ENS+avatar, the Nouns delegated to this voter (thumbnails), a
 * "delegated from / delegated to" line, and a one-line stats summary.
 */

'use client';

import { useMemo, useCallback } from 'react';
import { formatAddress } from '@/shared/format';
import { useEnsName, useEnsAvatar } from '@/OS/hooks/useEnsData';
import { NounImage } from '@/app/lib/nouns/components';
import { useVoter } from '../hooks/useVoters';
import { addressToAvatar } from '../utils/addressAvatar';
import styles from './VoterHoverCard.module.css';

interface VoterHoverCardProps {
  address: string;
  /** Navigation handler — invoked on click anywhere on the card. */
  onNavigate?: (path: string) => void;
}

// Show at most this many Noun thumbnails inside the popover so it stays
// compact regardless of how many Nouns the address represents.
const MAX_NOUN_THUMBNAILS = 6;

export function VoterHoverCard({ address, onNavigate }: VoterHoverCardProps) {
  const ensName = useEnsName(address);
  const ensAvatar = useEnsAvatar(address);
  const fallback = useMemo(() => addressToAvatar(address), [address]);
  const avatarSrc = ensAvatar || fallback;

  const { data: voter, isLoading } = useVoter(address);

  const displayName = formatAddress(address, ensName);
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const handleAvatarError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      if (fallback && e.currentTarget.src !== fallback) {
        e.currentTarget.src = fallback;
      }
    },
    [fallback],
  );

  const goToProfile = useCallback(() => {
    onNavigate?.(`voter/${address}`);
  }, [address, onNavigate]);

  const nouns =
    voter?.nounsRepresented?.slice(0, MAX_NOUN_THUMBNAILS) || [];
  const extraNounCount = (voter?.nounsRepresented?.length || 0) - nouns.length;

  // Stats — only what useVoter actually returns. Some metrics in the
  // mocked screenshot (bids, settles, comments) aren't surfaced by the
  // current API and are omitted intentionally.
  const stats: string[] = [];
  if (voter?.recentVotes?.length) {
    stats.push(`${voter.recentVotes.length} votes`);
  }
  if (voter?.proposals?.length) {
    stats.push(`${voter.proposals.length} proposals`);
  }
  if (voter?.candidates?.length) {
    stats.push(`${voter.candidates.length} candidates`);
  }
  if (voter?.sponsored?.length) {
    stats.push(`${voter.sponsored.length} sponsored`);
  }

  return (
    <div
      className={styles.card}
      onClick={goToProfile}
      role={onNavigate ? 'link' : undefined}
    >
      <div className={styles.header}>
        <img
          src={avatarSrc}
          alt=""
          className={styles.avatar}
          onError={handleAvatarError}
        />
        <div className={styles.identity}>
          <span className={styles.name}>{displayName}</span>
          {displayName !== shortAddress && (
            <span className={styles.address}>{shortAddress}</span>
          )}
        </div>
        {onNavigate && <span className={styles.chevron} aria-hidden>›</span>}
      </div>

      {isLoading && !voter && (
        <div className={styles.loading}>Loading…</div>
      )}

      {nouns.length > 0 && (
        <div className={styles.nounsRow}>
          {nouns.map((noun) => (
            <div key={noun.id} className={styles.nounCell}>
              {noun.seed ? (
                <NounImage
                  seed={noun.seed}
                  size={36}
                  className={styles.nounImage}
                />
              ) : (
                <div className={styles.nounImagePlaceholder} />
              )}
              <span className={styles.nounId}>{noun.id}</span>
            </div>
          ))}
          {extraNounCount > 0 && (
            <div className={styles.nounCellExtra}>
              <span className={styles.nounExtraCount}>+{extraNounCount}</span>
            </div>
          )}
        </div>
      )}

      {voter?.delegators && voter.delegators.length > 0 && (
        <div className={styles.delegationLine}>
          <strong>{voter.delegators.length} delegated</strong>
          {voter.delegators.length === 1 && (
            <>
              {' from '}
              <DelegatorName address={voter.delegators[0]} />
            </>
          )}
        </div>
      )}

      {voter?.delegatingTo &&
        voter.delegatingTo.toLowerCase() !== address.toLowerCase() && (
          <div className={styles.delegationLine}>
            <span className={styles.delegationMuted}>Delegating to </span>
            <DelegatorName address={voter.delegatingTo} />
          </div>
        )}

      {stats.length > 0 && (
        <div className={styles.stats}>{stats.join(', ')}</div>
      )}
    </div>
  );
}

// Inline ENS-aware name renderer for the delegators/delegating-to lines.
function DelegatorName({ address }: { address: string }) {
  const ensName = useEnsName(address);
  return <span>{formatAddress(address, ensName)}</span>;
}
