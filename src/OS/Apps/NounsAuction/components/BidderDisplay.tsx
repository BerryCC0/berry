/**
 * BidderDisplay Component
 * Displays bidder address with ENS name
 */

'use client';

import { useEnsName, useEnsAvatar } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { truncateAddress } from '../utils/auctionHelpers';
import styles from './BidderDisplay.module.css';

interface BidderDisplayProps {
  address: string;
}

export function BidderDisplay({ address }: BidderDisplayProps) {
  const { data: ensName } = useEnsName({
    address: address as `0x${string}`,
    chainId: mainnet.id,
  });

  const { data: ensAvatar } = useEnsAvatar({
    name: ensName ?? undefined,
    chainId: mainnet.id,
  });

  return (
    <div className={styles.bidderDisplay}>
      {ensAvatar ? (
        <img
          src={ensAvatar}
          alt={ensName || address}
          className={styles.avatar}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div className={styles.avatarPlaceholder} />
      )}
      <span className={styles.name}>
        {ensName || truncateAddress(address)}
      </span>
    </div>
  );
}

