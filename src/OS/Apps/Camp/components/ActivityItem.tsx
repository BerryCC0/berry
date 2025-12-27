/**
 * ActivityItem Component
 * Displays a single activity feed item
 * 
 * Supports:
 * - Votes and proposal feedback/signals
 * - Proposal and candidate creation
 * - Noun transfers and delegations
 * - Auction starts and settlements
 */

'use client';

import { useEnsName } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { formatEther } from 'viem';
import { NounImageById } from '@/app/lib/nouns/components';
import { getSupportLabel, getSupportColor, type ActivityItem as ActivityItemType } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import styles from './ActivityItem.module.css';

interface ActivityItemProps {
  item: ActivityItemType;
  onClickProposal?: (id: string) => void;
  onClickVoter?: (address: string) => void;
  onClickCandidate?: (proposer: string, slug: string) => void;
}

export function ActivityItem({ item, onClickProposal, onClickVoter, onClickCandidate }: ActivityItemProps) {
  const { data: actorEns } = useEnsName({
    address: item.actor as `0x${string}`,
    chainId: mainnet.id,
  });

  const { data: toAddressEns } = useEnsName({
    address: item.toAddress as `0x${string}` | undefined,
    chainId: mainnet.id,
  });

  const { data: winnerEns } = useEnsName({
    address: item.winner as `0x${string}` | undefined,
    chainId: mainnet.id,
  });

  const formatAddress = (address: string, ensName?: string | null) => 
    ensName || `${address.slice(0, 6)}...${address.slice(-4)}`;

  const displayName = formatAddress(item.actor, actorEns);
  const timeAgo = formatTimeAgo(Number(item.timestamp));

  // Parse noun ID for image rendering
  const nounId = item.nounId ? parseInt(item.nounId, 10) : undefined;

  const handleActorClick = () => {
    onClickVoter?.(item.actor);
  };

  const handleToAddressClick = () => {
    if (item.toAddress) {
      onClickVoter?.(item.toAddress);
    }
  };

  const handleProposalClick = () => {
    if (item.proposalId) {
      onClickProposal?.(item.proposalId);
    }
  };

  const handleCandidateClick = () => {
    if (item.candidateProposer && item.candidateSlug) {
      onClickCandidate?.(item.candidateProposer, item.candidateSlug);
    }
  };

  // Render based on activity type
  const renderContent = () => {
    switch (item.type) {
      case 'vote':
  return (
          <>
      <div className={styles.header}>
              <span className={styles.actor} onClick={handleActorClick} role="button" tabIndex={0}>
          {displayName}
        </span>
              <span className={styles.action}>voted</span>
        {item.support !== undefined && (
                <span className={styles.support} style={{ color: getSupportColor(item.support) }}>
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
              <div className={styles.proposal} onClick={handleProposalClick} role="button" tabIndex={0}>
                Prop {item.proposalId}: {item.proposalTitle}
              </div>
            )}
            {item.reason && (
              <MarkdownRenderer content={item.reason} className={styles.reason} />
            )}
          </>
        );

      case 'proposal_feedback':
        return (
          <>
            <div className={styles.header}>
              <span className={styles.actor} onClick={handleActorClick} role="button" tabIndex={0}>
                {displayName}
              </span>
              <span className={styles.action}>signaled</span>
              {item.support !== undefined && (
                <span className={styles.support} style={{ color: getSupportColor(item.support) }}>
                  {getSupportLabel(item.support)}
                </span>
              )}
            </div>
      {item.proposalTitle && (
              <div className={styles.proposal} onClick={handleProposalClick} role="button" tabIndex={0}>
          Prop {item.proposalId}: {item.proposalTitle}
        </div>
      )}
      {item.reason && (
              <MarkdownRenderer content={item.reason} className={styles.reason} />
            )}
          </>
        );

      case 'proposal_created':
        return (
          <>
            <div className={styles.header}>
              <span className={styles.actor} onClick={handleActorClick} role="button" tabIndex={0}>
                {displayName}
              </span>
              <span className={styles.action}>created proposal</span>
              <span className={styles.badge} data-type="proposal">New</span>
            </div>
            {item.proposalTitle && (
              <div className={styles.proposal} onClick={handleProposalClick} role="button" tabIndex={0}>
                Prop {item.proposalId}: {item.proposalTitle}
              </div>
            )}
          </>
        );

      case 'candidate_created':
        return (
          <>
            <div className={styles.header}>
              <span className={styles.actor} onClick={handleActorClick} role="button" tabIndex={0}>
                {displayName}
              </span>
              <span className={styles.action}>created candidate</span>
              <span className={styles.badge} data-type="candidate">Candidate</span>
            </div>
            {item.candidateSlug && (
              <div className={styles.proposal} onClick={handleCandidateClick} role="button" tabIndex={0}>
                {item.candidateSlug}
              </div>
      )}
          </>
        );

      case 'noun_transfer':
        return (
          <div className={styles.nounActivity}>
            {nounId !== undefined && (
              <NounImageById id={nounId} size={48} className={styles.nounImage} />
            )}
            <div className={styles.nounContent}>
              <div className={styles.header}>
                <span className={styles.actor} onClick={handleActorClick} role="button" tabIndex={0}>
                  {displayName}
                </span>
                <span className={styles.action}>transferred</span>
                <span className={styles.nounBadge}>Noun {item.nounId}</span>
              </div>
              <div className={styles.header}>
                <span className={styles.action}>to</span>
                <span className={styles.actor} onClick={handleToAddressClick} role="button" tabIndex={0}>
                  {item.toAddress && formatAddress(item.toAddress, toAddressEns)}
                </span>
              </div>
            </div>
          </div>
        );

      case 'noun_delegation':
        return (
          <div className={styles.nounActivity}>
            {nounId !== undefined && (
              <NounImageById id={nounId} size={48} className={styles.nounImage} />
            )}
            <div className={styles.nounContent}>
              <div className={styles.header}>
                <span className={styles.actor} onClick={handleActorClick} role="button" tabIndex={0}>
                  {displayName}
                </span>
                <span className={styles.action}>delegated</span>
                <span className={styles.nounBadge}>Noun {item.nounId}</span>
              </div>
              <div className={styles.header}>
                <span className={styles.action}>to</span>
                <span className={styles.actor} onClick={handleToAddressClick} role="button" tabIndex={0}>
                  {item.toAddress && formatAddress(item.toAddress, toAddressEns)}
                </span>
              </div>
            </div>
          </div>
        );

      case 'auction_settled':
        return (
          <div className={styles.nounActivity}>
            {nounId !== undefined && (
              <NounImageById id={nounId} size={48} className={styles.nounImage} />
            )}
            <div className={styles.nounContent}>
              <div className={styles.header}>
                <span className={styles.nounBadge}>Noun {item.nounId}</span>
                <span className={styles.action}>won by</span>
                <span className={styles.actor} onClick={handleActorClick} role="button" tabIndex={0}>
                  {item.winner && formatAddress(item.winner, winnerEns)}
                </span>
              </div>
              {item.winningBid && (
                <div className={styles.auctionDetails}>
                  <span className={styles.bidAmount}>
                    Ξ {parseFloat(formatEther(BigInt(item.winningBid))).toFixed(2)}
                  </span>
                  <span className={styles.badge} data-type="settled">Settled</span>
                </div>
              )}
            </div>
          </div>
        );

      case 'auction_started':
        return (
          <div className={styles.nounActivity}>
            {nounId !== undefined && (
              <NounImageById id={nounId} size={48} className={styles.nounImage} />
            )}
            <div className={styles.nounContent}>
              <div className={styles.header}>
                <span className={styles.nounBadge}>Noun {item.nounId}</span>
                <span className={styles.action}>auction started</span>
                <span className={styles.badge} data-type="auction">Live</span>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className={styles.header}>
            <span className={styles.actor} onClick={handleActorClick} role="button" tabIndex={0}>
              {displayName}
            </span>
            <span className={styles.action}>performed action</span>
          </div>
        );
    }
  };

  return (
    <div className={`${styles.item} ${styles[`type-${item.type.replace(/_/g, '-')}`] || ''}`}>
      {renderContent()}
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
