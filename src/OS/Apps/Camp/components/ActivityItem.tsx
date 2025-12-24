/**
 * ActivityItem Component
 * Displays a single activity feed item
 */

'use client';

import { useEnsName } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { getSupportLabel, getSupportColor, type ActivityItem as ActivityItemType } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import styles from './ActivityItem.module.css';

interface ActivityItemProps {
  item: ActivityItemType;
  onClickProposal?: (id: string) => void;
  onClickVoter?: (address: string) => void;
}

export function ActivityItem({ item, onClickProposal, onClickVoter }: ActivityItemProps) {
  const { data: ensName } = useEnsName({
    address: item.actor as `0x${string}`,
    chainId: mainnet.id,
  });

  const displayName = ensName || `${item.actor.slice(0, 6)}...${item.actor.slice(-4)}`;
  const timeAgo = formatTimeAgo(Number(item.timestamp));

  const handleActorClick = () => {
    onClickVoter?.(item.actor);
  };

  const handleProposalClick = () => {
    if (item.proposalId) {
      onClickProposal?.(item.proposalId);
    }
  };

  return (
    <div className={styles.item}>
      <div className={styles.header}>
        <span 
          className={styles.actor} 
          onClick={handleActorClick}
          role="button"
          tabIndex={0}
        >
          {displayName}
        </span>
        <span className={styles.action}>
          {item.type === 'vote' && 'voted'}
          {item.type === 'proposal_feedback' && 'signaled'}
        </span>
        {item.support !== undefined && (
          <span 
            className={styles.support}
            style={{ color: getSupportColor(item.support) }}
          >
            {getSupportLabel(item.support)}
          </span>
        )}
        {item.votes && (
          <span className={styles.votes}>
            ({item.votes} {item.votes === '1' ? 'vote' : 'votes'})
          </span>
        )}
      </div>

      {item.proposalTitle && (
        <div 
          className={styles.proposal}
          onClick={handleProposalClick}
          role="button"
          tabIndex={0}
        >
          Prop {item.proposalId}: {item.proposalTitle}
        </div>
      )}

      {item.reason && (
        <MarkdownRenderer 
          content={item.reason} 
          className={styles.reason}
        />
      )}

      <div className={styles.time}>{timeAgo}</div>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

