/**
 * VoterRow Component
 * Displays a voter/feedback with ENS resolution
 */

'use client';

import { useEnsName } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { useTranslation } from '@/OS/lib/i18n';
import { getSupportColor } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import styles from './VoterRow.module.css';

interface VoterRowProps {
  address: string;
  support: number;
  votes: string;
  reason?: string | null;
  timestamp: string;
  isFeedback?: boolean;
  onNavigate: (path: string) => void;
}

export function VoterRow({ 
  address, 
  support, 
  votes, 
  reason, 
  timestamp,
  isFeedback = false,
  onNavigate 
}: VoterRowProps) {
  const { t } = useTranslation();
  const { data: ensName } = useEnsName({
    address: address as `0x${string}`,
    chainId: mainnet.id,
  });

  const displayName = ensName || `${address.slice(0, 6)}...${address.slice(-4)}`;
  const date = new Date(Number(timestamp) * 1000);
  const dateStr = date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });

  // Translate support label
  const supportLabel = support === 1 
    ? t('camp.vote.for') 
    : support === 0 
      ? t('camp.vote.against') 
      : t('camp.vote.abstain');
  
  // Translate vote/signal label
  const voteLabel = isFeedback ? t('camp.vote.signal') : t('camp.vote.vote');

  return (
    <div 
      className={`${styles.row} ${isFeedback ? styles.feedback : ''}`}
      onClick={() => onNavigate(`voter/${address}`)}
    >
      <div className={styles.header}>
        <span className={styles.name}>{displayName}</span>
        <span 
          className={styles.support}
          style={{ color: getSupportColor(support) }}
        >
          {supportLabel}
        </span>
        <span className={styles.votes}>{votes} {voteLabel}{Number(votes) !== 1 ? 's' : ''}</span>
        <span className={styles.date}>{dateStr}</span>
        {isFeedback && <span className={styles.badge}>{t('camp.vote.signal')}</span>}
      </div>
      {reason && (
        <MarkdownRenderer 
          content={reason} 
          className={styles.reason}
        />
      )}
    </div>
  );
}
