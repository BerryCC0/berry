/**
 * VoterIdentity
 * Shared avatar + name renderer for a voter address.
 *
 * Uses the ENS avatar when available, otherwise falls back to a deterministic
 * Blockies-style pixel-art avatar derived from the address. This matches the
 * Activity feed's address rendering so voters without ENS still get a visual
 * identifier instead of a flat gray placeholder.
 */

'use client';

import { useMemo, useCallback } from 'react';
import { formatAddress } from '@/shared/format';
import { useEnsName, useEnsAvatar } from '@/OS/hooks/useEnsData';
import { addressToAvatar } from '../utils/addressAvatar';
import styles from './VoterIdentity.module.css';

interface VoterIdentityProps {
  address: string;
  /** Optional className to override container styling */
  className?: string;
}

export function VoterIdentity({ address, className }: VoterIdentityProps) {
  const ensName = useEnsName(address);
  const ensAvatar = useEnsAvatar(address);
  const fallback = useMemo(() => addressToAvatar(address), [address]);
  const src = ensAvatar || fallback;

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      // If the ENS avatar URL fails to load (broken IPFS, dead URL, etc.),
      // swap to the deterministic blockies fallback so we never show a broken image.
      if (fallback && e.currentTarget.src !== fallback) {
        e.currentTarget.src = fallback;
      }
    },
    [fallback],
  );

  const displayName = formatAddress(address, ensName);

  return (
    <div className={`${styles.voterIdentity} ${className || ''}`}>
      <img
        src={src}
        alt=""
        className={styles.voterAvatar}
        onError={handleError}
      />
      <span className={styles.voterName}>{displayName}</span>
    </div>
  );
}
