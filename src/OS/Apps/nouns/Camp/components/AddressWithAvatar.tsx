/**
 * AddressWithAvatar
 * Displays an address with ENS avatar and name
 */

'use client';

import { useMemo, useCallback } from 'react';
import { formatAddress } from '@/shared/format';
import { useEnsName, useEnsAvatar } from '@/OS/hooks/useEnsData';
import { addressToAvatar } from '../utils/addressAvatar';
import styles from './AddressWithAvatar.module.css';

interface AddressWithAvatarProps {
  address: string;
  onClick?: () => void;
}

export function AddressWithAvatar({ address, onClick }: AddressWithAvatarProps) {
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

  return (
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
}
