/**
 * AddressWithAvatar
 * Displays an address with ENS avatar and name
 */

'use client';

import { useEnsName, useEnsAvatar } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import styles from './AddressWithAvatar.module.css';

interface AddressWithAvatarProps {
  address: string;
  onClick?: () => void;
}

export function AddressWithAvatar({ address, onClick }: AddressWithAvatarProps) {
  const { data: ensName } = useEnsName({
    address: address as `0x${string}`,
    chainId: mainnet.id,
  });
  
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName || undefined,
    chainId: mainnet.id,
  });
  
  const displayName = ensName || `${address.slice(0, 6)}...${address.slice(-4)}`;
  
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
