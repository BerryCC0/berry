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
  onClickAuction?: (nounId: string) => void;
}

/**
 * Format a candidate slug into a readable title
 * e.g., "the-great-delegation---case-study-(part-ii-of-ii)" → "The Great Delegation - Case Study (Part II of II)"
 */
function formatSlugToTitle(slug: string): string {
  return slug
    // Replace multiple hyphens with a single dash surrounded by spaces
    .replace(/---+/g, ' - ')
    // Replace remaining hyphens with spaces
    .replace(/-/g, ' ')
    // Capitalize first letter of each word
    .replace(/\b\w/g, c => c.toUpperCase())
    // Fix common patterns
    .replace(/\bIi\b/g, 'II')
    .replace(/\bIii\b/g, 'III')
    .replace(/\bIv\b/g, 'IV')
    .replace(/\bOf\b/g, 'of')
    .replace(/\bThe\b/g, 'the')
    .replace(/\bA\b/g, 'a')
    .replace(/\bAn\b/g, 'an')
    .replace(/\bAnd\b/g, 'and')
    .replace(/\bFor\b/g, 'for')
    .replace(/\bTo\b/g, 'to')
    // Always capitalize first character
    .replace(/^./, c => c.toUpperCase());
}

export function ActivityItem({ item, onClickProposal, onClickVoter, onClickCandidate, onClickAuction }: ActivityItemProps) {
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

  const { data: settlerEns } = useEnsName({
    address: item.settler as `0x${string}` | undefined,
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
          <div className={styles.header}>
            <span className={styles.actor} onClick={handleActorClick} role="button" tabIndex={0}>
              {displayName}
            </span>
            <span className={styles.action}>created</span>
            <span className={styles.badge} data-type="proposal">Proposal</span>
            {item.proposalTitle && (
              <span className={styles.titleLink} onClick={handleProposalClick} role="button" tabIndex={0}>
                {item.proposalTitle}
              </span>
            )}
          </div>
        );

      case 'candidate_created':
        return (
          <div className={styles.header}>
            <span className={styles.actor} onClick={handleActorClick} role="button" tabIndex={0}>
              {displayName}
            </span>
            <span className={styles.action}>created</span>
            <span className={styles.badge} data-type="candidate">Candidate</span>
            {item.candidateSlug && (
              <span className={styles.titleLink} onClick={handleCandidateClick} role="button" tabIndex={0}>
                {formatSlugToTitle(item.candidateSlug)}
              </span>
            )}
          </div>
        );

      case 'noun_transfer':
        return (
          <div className={styles.header}>
            <span className={styles.actor} onClick={handleActorClick} role="button" tabIndex={0}>
              {displayName}
            </span>
            <span className={styles.action}>transferred</span>
            {nounId !== undefined && (
              <NounImageById id={nounId} size={18} className={styles.nounImageInline} />
            )}
            <span className={styles.nounBadge}>Noun <strong>{item.nounId}</strong></span>
            <span className={styles.action}>to</span>
            <span className={styles.actor} onClick={handleToAddressClick} role="button" tabIndex={0}>
              {item.toAddress && formatAddress(item.toAddress, toAddressEns)}
            </span>
          </div>
        );

      case 'noun_delegation':
        return (
          <div className={styles.header}>
            <span className={styles.actor} onClick={handleActorClick} role="button" tabIndex={0}>
              {displayName}
            </span>
            <span className={styles.action}>delegated</span>
            {nounId !== undefined && (
              <NounImageById id={nounId} size={18} className={styles.nounImageInline} />
            )}
            <span className={styles.nounBadge}>Noun <strong>{item.nounId}</strong></span>
            <span className={styles.action}>to</span>
            <span className={styles.actor} onClick={handleToAddressClick} role="button" tabIndex={0}>
              {item.toAddress && formatAddress(item.toAddress, toAddressEns)}
            </span>
          </div>
        );

      case 'auction_settled':
        const handleSettledSettlerClick = () => {
          if (item.settler) {
            onClickVoter?.(item.settler);
          }
        };

        return (
          <div className={styles.nounActivity}>
            {nounId !== undefined && (
              <NounImageById id={nounId} size={48} className={styles.nounImage} />
            )}
            <div className={styles.nounContent}>
              <div className={styles.header}>
                <span className={styles.nounBadge}>Noun <strong>{item.nounId}</strong></span>
                <span className={styles.action}>won by</span>
                <span className={styles.actor} onClick={handleActorClick} role="button" tabIndex={0}>
                  {item.winner && formatAddress(item.winner, winnerEns)}
                </span>
              </div>
              <div className={styles.auctionDetails}>
                {item.winningBid && (
                  <span className={styles.bidAmount}>
                    Ξ {parseFloat(formatEther(BigInt(item.winningBid))).toFixed(2)}
                  </span>
                )}
                {item.settler && (
                  <span className={styles.settlerInfo}>
                    <span className={styles.action}>Settled by</span>
                    <span className={styles.actor} onClick={handleSettledSettlerClick} role="button" tabIndex={0}>
                      {formatAddress(item.settler, settlerEns)}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        );

      case 'auction_started':
        const handleSettlerClick = () => {
          if (item.settler) {
            onClickVoter?.(item.settler);
          }
        };

        const handleAuctionClick = () => {
          if (item.nounId) {
            onClickAuction?.(item.nounId);
          }
        };
        
        return (
          <div className={styles.nounActivity}>
            {nounId !== undefined && (
              <NounImageById 
                id={nounId} 
                size={48} 
                className={`${styles.nounImage} ${styles.clickable}`} 
                onClick={handleAuctionClick}
              />
            )}
            <div className={styles.nounContent}>
              <div className={styles.header}>
                <span className={styles.nounBadge}>Noun <strong>{item.nounId}</strong></span>
                <span className={styles.action}>auction started</span>
                <span 
                  className={styles.badge} 
                  data-type="auction" 
                  onClick={handleAuctionClick}
                  role="button"
                  tabIndex={0}
                >
                  Live
                </span>
              </div>
              {item.settler && (
                <div className={styles.header}>
                  <span className={styles.action}> Settled by</span>
                  <span className={styles.actor} onClick={handleSettlerClick} role="button" tabIndex={0}>
                    {formatAddress(item.settler, settlerEns)}
                  </span>
                </div>
              )}
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
