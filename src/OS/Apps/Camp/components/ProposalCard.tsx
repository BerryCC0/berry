/**
 * ProposalCard Component
 * Compact proposal display for lists
 */

'use client';

import type { Proposal } from '../types';
import styles from './ProposalCard.module.css';

interface ProposalCardProps {
  proposal: Proposal;
  onClick?: () => void;
}

export function ProposalCard({ proposal, onClick }: ProposalCardProps) {
  const forVotes = Number(proposal.forVotes);
  const againstVotes = Number(proposal.againstVotes);
  const totalVotes = forVotes + againstVotes;
  const forPercent = totalVotes > 0 ? (forVotes / totalVotes) * 100 : 50;

  return (
    <div className={styles.card} onClick={onClick} role="button" tabIndex={0}>
      <div className={styles.header}>
        <span className={styles.id}>#{proposal.id}</span>
        <span className={`${styles.status} ${styles[proposal.status.toLowerCase()]}`}>
          {proposal.status}
        </span>
      </div>
      
      <div className={styles.title}>{proposal.title}</div>
      
      <div className={styles.votes}>
        <div className={styles.voteBar}>
          <div 
            className={styles.forBar} 
            style={{ width: `${forPercent}%` }}
          />
        </div>
        <div className={styles.voteLabels}>
          <span className={styles.forLabel}>{forVotes} For</span>
          <span className={styles.againstLabel}>{againstVotes} Against</span>
        </div>
      </div>
    </div>
  );
}

