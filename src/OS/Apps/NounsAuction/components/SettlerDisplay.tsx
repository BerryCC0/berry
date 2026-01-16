/**
 * SettlerDisplay Component
 * Shows who settled/minted a Noun (the person who triggered the previous auction settlement)
 */

'use client';

import { useEffect, useState } from 'react';
import { useEnsName, useEnsAvatar } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { truncateAddress } from '../utils/auctionHelpers';
import styles from './SettlerDisplay.module.css';

interface SettlerDisplayProps {
  nounId: string | null;
  loading?: boolean;
}

interface NounData {
  settled_by_address?: string;
}

export function SettlerDisplay({ nounId, loading = false }: SettlerDisplayProps) {
  const [settlerAddress, setSettlerAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch settler info from our API
  useEffect(() => {
    if (!nounId) {
      setSettlerAddress(null);
      return;
    }

    const fetchSettler = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/nouns/${nounId}`);
        if (response.ok) {
          const data: NounData = await response.json();
          if (data.settled_by_address && 
              data.settled_by_address !== '0x0000000000000000000000000000000000000000') {
            setSettlerAddress(data.settled_by_address);
          } else {
            setSettlerAddress(null);
          }
        } else {
          setSettlerAddress(null);
        }
      } catch {
        setSettlerAddress(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettler();
  }, [nounId]);

  // ENS resolution for settler
  const { data: ensName } = useEnsName({
    address: settlerAddress as `0x${string}` | undefined,
    chainId: mainnet.id,
  });

  const { data: ensAvatar } = useEnsAvatar({
    name: ensName || undefined,
    chainId: mainnet.id,
  });

  // Don't render if no settler data
  if (loading || isLoading) {
    return (
      <div className={styles.settlerDisplay}>
        <span className={styles.label}>Settled by</span>
        <span className={styles.value}>...</span>
      </div>
    );
  }

  if (!settlerAddress) {
    return null;
  }

  const displayName = ensName || truncateAddress(settlerAddress);

  return (
    <div className={styles.settlerDisplay}>
      <span className={styles.label}>Settled by</span>
      <div className={styles.settler}>
        {ensAvatar && (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={ensAvatar} 
            alt="" 
            className={styles.avatar}
          />
        )}
        <span className={styles.value}>{displayName}</span>
      </div>
    </div>
  );
}
