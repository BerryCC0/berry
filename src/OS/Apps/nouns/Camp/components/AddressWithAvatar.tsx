/**
 * AddressWithAvatar
 * Displays an address with ENS avatar and name
 */

'use client';

import { formatAddress } from '@/shared/format';
import { useEnsName, useEnsAvatar } from '@/OS/hooks/useEnsData';
import styles from './AddressWithAvatar.module.css';

interface AddressWithAvatarProps {
  address: string;
  onClick?: () => void;
}

export function AddressWithAvatar({ address, onClick }: AddressWithAvatarProps) {
  const ensName = useEnsName(address);
  const ensAvatar = useEnsAvatar(address);

  const displayName = formatAddress(address, ensName);
  
  return (
    <span className={styles.addressWithAvatar} onClick={onClick}>
      {ensAvatar ? (
        <img src={ensAvatar} alt="" className={styles.miniAvatar} />
      ) : (
        <span className={styles.miniAvatarPlaceholder} />
      )}
      <span className={styles.addressName}>{displayName}</span>
    </span>
  );
}
