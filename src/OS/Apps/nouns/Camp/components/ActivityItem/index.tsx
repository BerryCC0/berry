/**
 * ActivityItem Component
 *
 * Orchestrator that calls hooks and delegates rendering to per-type
 * sub-components.  Each sub-component is pure presentation — all data
 * fetching and ENS resolution happens here.
 *
 * Sub-components by activity category:
 *   - VoteContent: vote, proposal_feedback
 *   - ProposalLifecycleContent: proposal_created/voting_started/succeeded/
 *     defeated/cancelled/queued/executed/updated
 *   - CandidateContent: candidate_created/feedback/sponsored/updated
 *   - TransferContent: noun_transfer, noun_delegation
 *   - AuctionContent: auction_settled, auction_started
 */

'use client';

import { memo } from 'react';
import type { ActivityItem as ActivityItemType } from '../../types';
import { useActivityItemData } from '../../hooks/useActivityItemData';
import { useSalePrice } from '../../hooks/useSalePrice';
import { VoteContent } from './VoteContent';
import { ProposalLifecycleContent } from './ProposalLifecycleContent';
import { CandidateContent } from './CandidateContent';
import { TransferContent } from './TransferContent';
import { AuctionContent } from './AuctionContent';
import type { ActivityContentProps } from './types';
import styles from './ActivityItem.module.css';

interface ActivityItemProps {
  item: ActivityItemType;
  allItems?: ActivityItemType[];
  onClickProposal?: (id: string) => void;
  onClickVoter?: (address: string) => void;
  onClickCandidate?: (proposer: string, slug: string) => void;
  onClickAuction?: (nounId: string) => void;
}

function ActivityItemInner({
  item,
  allItems,
  onClickProposal,
  onClickVoter,
  onClickCandidate,
  onClickAuction,
}: ActivityItemProps) {
  // All ENS resolution, reply/repost detection, and computed values
  const hookData = useActivityItemData(item, allItems);

  // Lazy sale detection for noun transfers
  const isTransfer = item.type === 'noun_transfer';
  const { isSale, salePrice } = useSalePrice(
    isTransfer ? item.txHash : undefined,
    isTransfer && !item.isBulkTransfer ? item.fromAddress : undefined,
  );

  // Build shared props for sub-components
  const contentProps: ActivityContentProps = {
    item,
    displayName: hookData.displayName,
    actorAvatar: hookData.actorAvatar,
    toAddressEns: hookData.toAddressEns,
    winnerEns: hookData.winnerEns,
    settlerEns: hookData.settlerEns,
    replyOriginalPosterEns: hookData.replyOriginalPosterEns,
    repostOriginalPosterEns: hookData.repostOriginalPosterEns,
    replyOriginalPosterAddress: hookData.replyOriginalPosterAddress,
    repostOriginalPosterAddress: hookData.repostOriginalPosterAddress,
    nounId: hookData.nounId,
    repostInfo: hookData.repostInfo,
    replyInfo: hookData.replyInfo,
    fromContractLabel: hookData.fromContractLabel,
    toContractLabel: hookData.toContractLabel,
    isFromContract: hookData.isFromContract,
    isToContract: hookData.isToContract,
    isSale,
    salePrice,
    formatAddr: hookData.formatAddr,
    onClickActor: () => onClickVoter?.(item.actor),
    onClickToAddress: () => item.toAddress && onClickVoter?.(item.toAddress),
    onClickProposal: () => item.proposalId && onClickProposal?.(item.proposalId),
    onClickCandidate: () =>
      item.candidateSlug &&
      onClickCandidate?.(item.candidateProposer || '', item.candidateSlug),
    onClickAuction,
    onClickVoter,
  };

  const renderContent = () => {
    switch (item.type) {
      case 'vote':
      case 'proposal_feedback':
        return <VoteContent {...contentProps} />;

      case 'proposal_created':
      case 'proposal_voting_started':
      case 'proposal_succeeded':
      case 'proposal_defeated':
      case 'proposal_cancelled':
      case 'proposal_queued':
      case 'proposal_executed':
      case 'proposal_updated':
        return <ProposalLifecycleContent {...contentProps} />;

      case 'candidate_created':
      case 'candidate_feedback':
      case 'candidate_sponsored':
      case 'candidate_updated':
        return <CandidateContent {...contentProps} />;

      case 'noun_transfer':
      case 'noun_delegation':
        return <TransferContent {...contentProps} />;

      case 'auction_settled':
      case 'auction_started':
        return <AuctionContent {...contentProps} />;

      default:
        return (
          <div className={styles.header}>
            <span
              className={styles.actor}
              onClick={() => onClickVoter?.(item.actor)}
              role="button"
              tabIndex={0}
            >
              {hookData.displayName}
            </span>
            <span className={styles.action}>performed action</span>
          </div>
        );
    }
  };

  return (
    <div className={`${styles.item} ${styles[`type-${item.type.replace(/_/g, '-')}`] || ''}`}>
      {renderContent()}
      <div className={styles.time}>{hookData.timeAgo}</div>
    </div>
  );
}

export const ActivityItem = memo(ActivityItemInner);
