/**
 * AddressWithAvatar
 * Displays an address with ENS avatar and name
 */

'use client';

import { useMemo, useCallback } from 'react';
import { formatAddress } from '@/shared/format';
import { useEnsName, useEnsAvatar } from '@/OS/hooks/useEnsData';
import { HoverPopover } from './HoverPopover';
import { VoterHoverCard } from './VoterHoverCard';
import { addressToAvatar } from '../utils/addressAvatar';
import styles from './AddressWithAvatar.module.css';

interface AddressWithAvatarProps {
  address: string;
  onClick?: () => void;
  /**
   * When provided, the address is wrapped in a hover popover showing a
   * mini voter profile. Click behavior is unchanged (driven by onClick).
   */
  onNavigate?: (path: string) => void;
}

export function AddressWithAvatar({ address, onClick, onNavigate }: AddressWithAvatarProps) {
  const ensName = useEnsName(address);
  const ensAvatar = useEnsAvatar(address);
  const fallbackAvatar = useMemo(() => addressToAvatar(address), [address]);

  const displayName = formatAddress(address, ensName);

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      if (fallbackAvatar && e.currentTarget.src !== fallbackAvatar) {
        e.currentTarget.src = fallbackAvatar;
      }
    },
    [fallbackAvatar],
  );

  const inner = (
    <span className={styles.addressWithAvatar} onClick={onClick}>
      <img
        src={ensAvatar || fallbackAvatar}
        alt=""
        className={styles.miniAvatar}
        onError={handleError}
      />
      <span className={styles.addressName}>{displayName}</span>
    </span>
  );

  if (!onNavigate) return inner;

  return (
    <HoverPopover
      content={<VoterHoverCard address={address} onNavigate={onNavigate} />}
    >
      {inner}
    </HoverPopover>
  );
}
