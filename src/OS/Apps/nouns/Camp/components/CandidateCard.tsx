/**
 * CandidateCard Component
 * Compact candidate display for lists
 */

'use client';

import { memo } from 'react';
import { useEnsName } from '@/OS/hooks/useEnsData';
import type { Candidate } from '../types';
import styles from './CandidateCard.module.css';

interface CandidateCardProps {
  candidate: Candidate;
  onClick?: () => void;
}

function CandidateCardInner({ candidate, onClick }: CandidateCardProps) {
  const ensName = useEnsName(candidate.proposer);

  const proposerDisplay = ensName || `${candidate.proposer.slice(0, 6)}...${candidate.proposer.slice(-4)}`;
  const title = candidate.title || candidate.slug.replace(/-/g, ' ');
  const timeAgo = formatTimeAgo(Number(candidate.createdTimestamp));

  return (
    <div className={styles.card} onClick={onClick} role="button" tabIndex={0}>
      <div className={styles.header}>
        <span className={styles.proposer}>{proposerDisplay}</span>
        <span className={styles.time}>{timeAgo}</span>
      </div>
      
      <div className={styles.title}>{title}</div>
      
      <div className={styles.slug}>/{candidate.slug}</div>
    </div>
  );
}

export const CandidateCard = memo(CandidateCardInner);

function formatTimeAgo(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

