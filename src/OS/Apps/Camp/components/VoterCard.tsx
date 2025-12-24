/**
 * VoterCard Component
 * Compact voter/delegate display
 */

'use client';

import { useEnsName } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import type { Voter } from '../types';
import styles from './VoterCard.module.css';

interface VoterCardProps {
  voter: Voter;
  rank?: number;
  onClick?: () => void;
}

export function VoterCard({ voter, rank, onClick }: VoterCardProps) {
  const { data: ensName } = useEnsName({
    address: voter.id as `0x${string}`,
    chainId: mainnet.id,
  });

  const displayName = ensName || `${voter.id.slice(0, 6)}...${voter.id.slice(-4)}`;
  const votingPower = Number(voter.delegatedVotes);
  const represented = voter.tokenHoldersRepresentedAmount;

  return (
    <div className={styles.card} onClick={onClick} role="button" tabIndex={0}>
      <div className={styles.left}>
        {rank && <span className={styles.rank}>#{rank}</span>}
        <span className={styles.name}>{displayName}</span>
      </div>
      
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{votingPower}</span>
          <span className={styles.statLabel}>votes</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{represented}</span>
          <span className={styles.statLabel}>delegators</span>
        </div>
      </div>
    </div>
  );
}

