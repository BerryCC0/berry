/**
 * VoterRow Component
 * Displays a voter/feedback with ENS resolution
 */

'use client';

import { useMemo, useCallback } from 'react';
import { formatAddress } from '@/shared/format';
import { useEnsName, useEnsAvatar } from '@/OS/hooks/useEnsData';
import { useTranslation } from '@/OS/lib/i18n';
import { getClientName, isBerryOSClient } from '@/OS/lib/clientNames';
import { getSupportColor } from '../types';
import { addressToAvatar } from '../utils/addressAvatar';
import { MarkdownRenderer } from './MarkdownRenderer';
import styles from './VoterRow.module.css';

interface VoterRowProps {
  address: string;
  support: number;
  votes: string;
  reason?: string | null;
  timestamp: string;
  clientId?: number;
  isFeedback?: boolean;
  onNavigate: (path: string) => void;
}

export function VoterRow({ 
  address, 
  support, 
  votes, 
  reason, 
  timestamp,
  clientId,
  isFeedback = false,
  onNavigate 
}: VoterRowProps) {
  const { t } = useTranslation();
  const ensName = useEnsName(address);
  const ensAvatar = useEnsAvatar(address);
  const fallbackAvatar = useMemo(() => addressToAvatar(address), [address]);
  const avatarSrc = ensAvatar || fallbackAvatar;
  const handleAvatarError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    if (fallbackAvatar && e.currentTarget.src !== fallbackAvatar) {
      e.currentTarget.src = fallbackAvatar;
    }
  }, [fallbackAvatar]);

  const displayName = formatAddress(address, ensName);
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
    <div className={`${styles.row} ${isFeedback ? styles.feedback : ''}`}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.identity}
            onClick={() => onNavigate(`voter/${address}`)}
            aria-label={`View ${displayName}'s profile`}
          >
            <img
              src={avatarSrc}
              alt=""
              className={styles.avatar}
              onError={handleAvatarError}
            />
            <span className={styles.name}>{displayName}</span>
          </button>
          <span className={styles.votes}>{votes} {voteLabel}{Number(votes) !== 1 ? 's' : ''}</span>
          <span
            className={styles.support}
            style={{ color: getSupportColor(support) }}
          >
            {supportLabel}
          </span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.date}>{dateStr}</span>
          {isFeedback && <span className={styles.badge}>{t('camp.vote.signal')}</span>}
          {!isFeedback && clientId != null && clientId !== 0 && (
            <span className={`${styles.clientBadge} ${isBerryOSClient(clientId) ? styles.berryBadge : ''}`}>
              {getClientName(clientId)}
            </span>
          )}
        </div>
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
