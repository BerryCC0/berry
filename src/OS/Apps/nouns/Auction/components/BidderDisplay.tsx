/**
 * BidderDisplay Component
 * Displays bidder address with ENS name
 */

'use client';

import { useEnsName, useEnsAvatar } from '@/OS/hooks/useEnsData';
import { truncateAddress } from '../utils/auctionHelpers';
import styles from './BidderDisplay.module.css';

interface BidderDisplayProps {
  address: string;
}

export function BidderDisplay({ address }: BidderDisplayProps) {
  const ensName = useEnsName(address);
  const ensAvatar = useEnsAvatar(address);

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

