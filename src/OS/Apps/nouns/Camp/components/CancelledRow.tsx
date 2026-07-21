/**
 * CancelledRow
 * Feed entry showing who cancelled a proposal. Styled to sit alongside
 * VoterRow in the proposal activity feed, but without vote/support fields —
 * a cancellation isn't a vote.
 */

'use client';

import { useMemo, useCallback } from 'react';
import { formatAddress } from '@/shared/format';
import { useEnsName, useEnsAvatar } from '@/OS/hooks/useEnsData';
import { addressToAvatar } from '../utils/addressAvatar';
import { HoverPopover } from './HoverPopover';
import { VoterHoverCard } from './VoterHoverCard';
import styles from './CancelledRow.module.css';

interface CancelledRowProps {
  address: string;
  timestamp: string;
  txHash?: string;
  onNavigate: (path: string) => void;
}

export function CancelledRow({ address, timestamp, txHash, onNavigate }: CancelledRowProps) {
  const ensName = useEnsName(address);
  const ensAvatar = useEnsAvatar(address);
  const fallbackAvatar = useMemo(() => addressToAvatar(address), [address]);
  const avatarSrc = ensAvatar || fallbackAvatar;

  const handleAvatarError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      if (fallbackAvatar && e.currentTarget.src !== fallbackAvatar) {
        e.currentTarget.src = fallbackAvatar;
      }
    },
    [fallbackAvatar]
  );

  const displayName = formatAddress(address, ensName);
  const dateStr = new Date(Number(timestamp) * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className={styles.row}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <HoverPopover content={<VoterHoverCard address={address} onNavigate={onNavigate} />}>
            <button
              type="button"
              className={styles.identity}
              onClick={() => onNavigate(`voter/${address}`)}
              aria-label={`View ${displayName}'s profile`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarSrc} alt="" className={styles.avatar} onError={handleAvatarError} />
              <span className={styles.name}>{displayName}</span>
            </button>
          </HoverPopover>
          <span className={styles.action}>cancelled this proposal</span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.date}>{dateStr}</span>
          {txHash && (
            <a
              href={`https://etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.txLink}
              aria-label="View cancellation transaction"
            >
              ↗
            </a>
          )}
          <span className={styles.badge}>Cancelled</span>
        </div>
      </div>
    </div>
  );
}
