/**
 * ProposalCard Component
 * Compact proposal display for lists
 */

'use client';

import { useTranslation } from '@/OS/lib/i18n';
import type { Proposal, ProposalStatus } from '../types';
import styles from './ProposalCard.module.css';

interface ProposalCardProps {
  proposal: Proposal;
  onClick?: () => void;
}

// Status translation keys
const statusKeys: Record<ProposalStatus, string> = {
  PENDING: 'camp.proposals.status.pending',
  ACTIVE: 'camp.proposals.status.active',
  CANCELLED: 'camp.proposals.status.cancelled',
  VETOED: 'camp.proposals.status.vetoed',
  QUEUED: 'camp.proposals.status.queued',
  EXECUTED: 'camp.proposals.status.executed',
  DEFEATED: 'camp.proposals.status.defeated',
  SUCCEEDED: 'camp.proposals.status.succeeded',
  EXPIRED: 'camp.proposals.status.expired',
  OBJECTION_PERIOD: 'camp.proposals.status.objectionPeriod',
  UPDATABLE: 'camp.proposals.status.updatable',
};

export function ProposalCard({ proposal, onClick }: ProposalCardProps) {
  const { t } = useTranslation();
  const forVotes = Number(proposal.forVotes);
  const againstVotes = Number(proposal.againstVotes);
  const abstainVotes = Number(proposal.abstainVotes || 0);
  const quorum = Number(proposal.quorumVotes) || 1;

  // Calculate scale: the max extent we need to show
  // Left side is max of forVotes or quorum (to show gap if needed)
  const leftExtent = Math.max(forVotes, quorum);
  const rightExtent = abstainVotes + againstVotes;
  const totalScale = leftExtent + rightExtent;

  // Calculate widths as percentages of total scale
  const forWidth = totalScale > 0 ? (forVotes / totalScale) * 100 : 0;
  const quorumPosition = totalScale > 0 ? (quorum / totalScale) * 100 : 50;
  const abstainWidth = totalScale > 0 ? (abstainVotes / totalScale) * 100 : 0;
  const againstWidth = totalScale > 0 ? (againstVotes / totalScale) * 100 : 0;
  
  // Gap between For and quorum marker (only if For < quorum)
  const gapWidth = forVotes < quorum ? quorumPosition - forWidth : 0;
  const quorumMet = forVotes >= quorum;

  const statusText = t(statusKeys[proposal.status] || 'camp.proposals.status.pending');

  return (
    <div className={styles.card} onClick={onClick} role="button" tabIndex={0}>
      <div className={styles.header}>
        <span className={styles.id}>#{proposal.id}</span>
        <span className={`${styles.status} ${styles[proposal.status.toLowerCase()]}`}>
          {statusText}
        </span>
      </div>
      
      <div className={styles.title}>{proposal.title}</div>
      
      <div className={styles.votes}>
        <div className={styles.voteLabelsRow}>
          <span className={styles.forLabel}>For {forVotes}</span>
          <div className={styles.rightLabels}>
            {abstainVotes > 0 && (
              <span className={styles.abstainLabel}>Abstain {abstainVotes}</span>
            )}
            {abstainVotes > 0 && againstVotes > 0 && (
              <span className={styles.labelSeparator}>·</span>
            )}
            {againstVotes > 0 && (
              <span className={styles.againstLabel}>Against {againstVotes}</span>
            )}
          </div>
        </div>
        
        <div className={styles.voteBarContainer}>
          {/* For votes (green) */}
          <div 
            className={styles.forSection} 
            style={{ width: `${forWidth}%` }}
          />
          
          {/* Gap to quorum (only if For < quorum) */}
          {gapWidth > 0 && (
            <div 
              className={styles.quorumSpace} 
              style={{ width: `${gapWidth}%` }}
            />
          )}
          
          {/* Quorum marker - absolutely positioned */}
          <div 
            className={styles.quorumMarker} 
            style={{ left: `${quorumPosition}%` }}
          />
          
          {/* Abstain votes (gray) */}
          {abstainVotes > 0 && (
            <div 
              className={styles.abstainSection} 
              style={{ width: `${abstainWidth}%` }}
            />
          )}
          
          {/* Against votes (red) */}
          {againstVotes > 0 && (
            <div 
              className={styles.againstSection} 
              style={{ width: `${againstWidth}%` }}
            />
          )}
        </div>
        
        <div className={styles.quorumLabel}>
          Quorum {quorum}{quorumMet ? ' (met)' : ''}
        </div>
      </div>
    </div>
  );
}

