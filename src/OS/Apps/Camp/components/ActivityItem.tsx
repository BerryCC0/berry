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

import { useMemo } from 'react';
import { useEnsName, useEnsAvatar } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { formatEther } from 'viem';
import { NounImageById } from '@/app/lib/nouns/components';
import { useTranslation, useContentTranslation } from '@/OS/lib/i18n';
import { getSupportLabel, getSupportColor, type ActivityItem as ActivityItemType } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { parseRepost, parseReply } from '../utils/repostParser';
import styles from './ActivityItem.module.css';

interface ActivityItemProps {
  item: ActivityItemType;
  allItems?: ActivityItemType[];
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

// Helper to find the original poster from a reply
function findOriginalPosterAddress(
  reason: string | undefined,
  allItems: ActivityItemType[] | undefined
): string | undefined {
  if (!reason || !allItems) return undefined;
  
  const replyInfo = parseReply(reason);
  if (!replyInfo) return undefined;
  
  const truncatedTarget = replyInfo.targetAuthor.toLowerCase();
  
  // Find a post where:
  // 1. The actor matches the truncated address
  // 2. The reason matches the quoted text
  for (const otherItem of allItems) {
    if (!otherItem.reason) continue;
    
    // Check if actor matches the truncated pattern
    const truncatedActor = `${otherItem.actor.slice(0, 6)}...${otherItem.actor.slice(-4)}`.toLowerCase();
    if (truncatedActor !== truncatedTarget) continue;
    
    // Check if the reason contains the quoted text (or matches exactly)
    const normalizedOther = otherItem.reason.trim().toLowerCase();
    const normalizedQuote = replyInfo.quotedText.trim().toLowerCase();
    
    if (normalizedOther === normalizedQuote || normalizedOther.includes(normalizedQuote)) {
      return otherItem.actor;
    }
  }
  
  return undefined;
}

// Helper to find the original poster from a repost
function findRepostOriginalPosterAddress(
  reason: string | undefined,
  allItems: ActivityItemType[] | undefined
): string | undefined {
  if (!reason || !allItems) return undefined;
  
  const repostInfo = parseRepost(reason);
  if (!repostInfo) return undefined;
  
  // Find a post where the reason matches the quoted text
  for (const otherItem of allItems) {
    if (!otherItem.reason) continue;
    
    // Check if the reason matches the quoted text
    const normalizedOther = otherItem.reason.trim().toLowerCase();
    const normalizedQuote = repostInfo.originalReason.trim().toLowerCase();
    
    if (normalizedOther === normalizedQuote || normalizedOther.includes(normalizedQuote)) {
      return otherItem.actor;
    }
  }
  
  return undefined;
}

export function ActivityItem({ item, allItems, onClickProposal, onClickVoter, onClickCandidate, onClickAuction }: ActivityItemProps) {
  const { t } = useTranslation();
  
  // Find original poster addresses BEFORE calling hooks (so hooks are always called in same order)
  const replyOriginalPosterAddress = findOriginalPosterAddress(item.reason, allItems);
  const repostOriginalPosterAddress = findRepostOriginalPosterAddress(item.reason, allItems);

  const { data: actorEns } = useEnsName({
    address: item.actor as `0x${string}`,
    chainId: mainnet.id,
  });

  const { data: actorAvatar } = useEnsAvatar({
    name: actorEns || undefined,
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

  // Resolve ENS for the original poster (if this is a reply)
  const { data: replyOriginalPosterEns } = useEnsName({
    address: replyOriginalPosterAddress as `0x${string}` | undefined,
    chainId: mainnet.id,
  });

  // Resolve ENS for the original poster (if this is a repost)
  const { data: repostOriginalPosterEns } = useEnsName({
    address: repostOriginalPosterAddress as `0x${string}` | undefined,
    chainId: mainnet.id,
  });

  const formatAddress = (address: string, ensName?: string | null) => 
    ensName || `${address.slice(0, 6)}...${address.slice(-4)}`;

  const displayName = formatAddress(item.actor, actorEns);
  const timeAgo = formatTimeAgo(Number(item.timestamp));

  // Render actor with optional avatar
  const renderActor = (avatar?: string | null, name?: string, onClick?: () => void) => (
    <span className={styles.actorWrapper}>
      {avatar && (
        <img src={avatar} alt="" className={styles.avatar} />
      )}
      <span className={styles.actor} onClick={onClick} role="button" tabIndex={0}>
        {name}
      </span>
    </span>
  );

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

  // Detect repost pattern in reason
  const repostInfo = useMemo(() => {
    if (!item.reason) return null;
    return parseRepost(item.reason);
  }, [item.reason]);

  // Detect reply pattern in reason  
  const replyInfo = useMemo(() => {
    if (!item.reason) return null;
    return parseReply(item.reason);
  }, [item.reason]);

  // Render the reason content - handles reposts and replies specially
  const renderReason = () => {
    // Don't render anything if there's no reason or it's just whitespace
    if (!item.reason || !item.reason.trim()) return null;

    // If it's a repost (+1 with quote), show who they're reposting and the content
    if (repostInfo) {
      // Use resolved ENS name if available, otherwise use the address
      const repostAuthorDisplay = repostOriginalPosterEns 
        || (repostOriginalPosterAddress ? formatAddress(repostOriginalPosterAddress, null) : null);
      
      return (
        <div className={styles.quotedReply}>
          {repostAuthorDisplay && (
            <div className={styles.quoteAttribution}>
              {t('camp.activity.reply.reposting')} {repostAuthorDisplay}
            </div>
          )}
          <MarkdownRenderer content={repostInfo.originalReason} className={styles.quotedText} />
        </div>
      );
    }

    // If it's a reply, show the reply body first, then quoted original
    if (replyInfo) {
      // Use resolved ENS name if available, otherwise use the original poster address, or fall back to truncated
      const originalPosterDisplay = replyOriginalPosterEns 
        || (replyOriginalPosterAddress ? formatAddress(replyOriginalPosterAddress, null) : replyInfo.targetAuthor);
      
      return (
        <div className={styles.replyContainer}>
          {/* Show the reply content first */}
          {replyInfo.replyBody && (
            <MarkdownRenderer content={replyInfo.replyBody} className={styles.reason} />
          )}
          {/* Show the quoted original with attribution */}
          <div className={styles.quotedReply}>
            <div className={styles.quoteAttribution}>
              {t('camp.activity.reply.replyingTo')} {originalPosterDisplay}
            </div>
            <MarkdownRenderer content={replyInfo.quotedText} className={styles.quotedText} />
          </div>
        </div>
      );
    }

    // Regular reason
    return <MarkdownRenderer content={item.reason} className={styles.reason} />;
  };

  // Render based on activity type
  const renderContent = () => {
    switch (item.type) {
      case 'vote':
        return (
          <>
            <div className={styles.header}>
              {renderActor(actorAvatar, displayName, handleActorClick)}
              {repostInfo ? (
                <>
                  <span className={styles.action}>reposted a</span>
                  {item.support !== undefined && (
                    <span className={styles.support} style={{ color: getSupportColor(item.support) }}>
                      {getSupportLabel(item.support)}
                    </span>
                  )}
                  <span className={styles.action}>vote</span>
                </>
              ) : (
                <>
                  <span className={styles.action}>voted</span>
                  {item.support !== undefined && (
                    <span className={styles.support} style={{ color: getSupportColor(item.support) }}>
                      {getSupportLabel(item.support)}
                    </span>
                  )}
                </>
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
            {renderReason()}
          </>
        );

      case 'proposal_feedback':
        return (
          <>
            <div className={styles.header}>
              {renderActor(actorAvatar, displayName, handleActorClick)}
              {repostInfo ? (
                <>
                  <span className={styles.action}>reposted a</span>
                  {item.support !== undefined && (
                    <span className={styles.support} style={{ color: getSupportColor(item.support) }}>
                      {getSupportLabel(item.support)}
                    </span>
                  )}
                  <span className={styles.action}>signal</span>
                </>
              ) : (
                <>
                  <span className={styles.action}>signaled</span>
                  {item.support !== undefined && (
                    <span className={styles.support} style={{ color: getSupportColor(item.support) }}>
                      {getSupportLabel(item.support)}
                    </span>
                  )}
                </>
              )}
            </div>
            {item.proposalTitle && (
              <div className={styles.proposal} onClick={handleProposalClick} role="button" tabIndex={0}>
                Prop {item.proposalId}: {item.proposalTitle}
              </div>
            )}
            {renderReason()}
          </>
        );

      case 'proposal_created':
        return (
          <div className={styles.header}>
            {renderActor(actorAvatar, displayName, handleActorClick)}
            <span className={styles.action}>created</span>
            <span className={styles.badge} data-type="proposal">Proposal</span>
            {item.proposalTitle && (
              <span className={styles.titleLink} onClick={handleProposalClick} role="button" tabIndex={0}>
                {item.proposalTitle}
              </span>
            )}
          </div>
        );

      case 'proposal_voting_started':
        return (
          <div className={styles.header}>
            <span className={styles.action}>Voting for</span>
            <span className={styles.badge} data-type="proposal">Proposal {item.proposalId}</span>
            {item.proposalTitle && (
              <span className={styles.titleLink} onClick={handleProposalClick} role="button" tabIndex={0}>
                {item.proposalTitle}
              </span>
            )}
            <span className={styles.action}>started</span>
          </div>
        );

      case 'proposal_succeeded':
        return (
          <div className={styles.header}>
            <span className={styles.badge} data-type="succeeded">Proposal {item.proposalId}</span>
            {item.proposalTitle && (
              <span className={styles.titleLink} onClick={handleProposalClick} role="button" tabIndex={0}>
                {item.proposalTitle}
              </span>
            )}
            <span className={styles.action}>succeeded</span>
          </div>
        );

      case 'proposal_defeated':
        return (
          <div className={styles.header}>
            <span className={styles.badge} data-type="defeated">Proposal {item.proposalId}</span>
            {item.proposalTitle && (
              <span className={styles.titleLink} onClick={handleProposalClick} role="button" tabIndex={0}>
                {item.proposalTitle}
              </span>
            )}
            <span className={styles.action}>was defeated</span>
          </div>
        );

      case 'proposal_cancelled':
        return (
          <div className={styles.header}>
            <span className={styles.badge} data-type="cancelled">Proposal {item.proposalId}</span>
            {item.proposalTitle && (
              <span className={styles.titleLink} onClick={handleProposalClick} role="button" tabIndex={0}>
                {item.proposalTitle}
              </span>
            )}
            <span className={styles.action}>was cancelled</span>
          </div>
        );

      case 'proposal_queued':
        return (
          <div className={styles.header}>
            <span className={styles.badge} data-type="queued">Proposal {item.proposalId}</span>
            {item.proposalTitle && (
              <span className={styles.titleLink} onClick={handleProposalClick} role="button" tabIndex={0}>
                {item.proposalTitle}
              </span>
            )}
            <span className={styles.action}>was queued for execution</span>
          </div>
        );

      case 'proposal_executed':
        return (
          <div className={styles.header}>
            <span className={styles.badge} data-type="executed">Proposal {item.proposalId}</span>
            {item.proposalTitle && (
              <span className={styles.titleLink} onClick={handleProposalClick} role="button" tabIndex={0}>
                {item.proposalTitle}
              </span>
            )}
            <span className={styles.action}>was executed</span>
          </div>
        );

      case 'proposal_updated':
        return (
          <>
            <div className={styles.header}>
              {renderActor(actorAvatar, displayName, handleActorClick)}
              <span className={styles.action}>updated</span>
              <span className={styles.badge} data-type="proposal">Proposal</span>
              {item.proposalTitle && (
                <span className={styles.titleLink} onClick={handleProposalClick} role="button" tabIndex={0}>
                  {item.proposalTitle}
                </span>
              )}
            </div>
            {item.updateMessage && (
              <MarkdownRenderer content={item.updateMessage} className={styles.reason} />
            )}
          </>
        );

      case 'candidate_created':
        return (
          <div className={styles.header}>
            {renderActor(actorAvatar, displayName, handleActorClick)}
            <span className={styles.action}>created</span>
            <span className={styles.badge} data-type="candidate">Candidate</span>
            {(item.candidateTitle || item.candidateSlug) && (
              <span className={styles.titleLink} onClick={handleCandidateClick} role="button" tabIndex={0}>
                {item.candidateTitle || formatSlugToTitle(item.candidateSlug!)}
              </span>
            )}
          </div>
        );

      case 'candidate_feedback':
        return (
          <>
            <div className={styles.header}>
              {renderActor(actorAvatar, displayName, handleActorClick)}
              {repostInfo ? (
                <>
                  <span className={styles.action}>reposted a</span>
                  {item.support !== undefined && (
                    <span className={styles.support} style={{ color: getSupportColor(item.support) }}>
                      {getSupportLabel(item.support)}
                    </span>
                  )}
                  <span className={styles.action}>signal</span>
                </>
              ) : (
                <>
                  <span className={styles.action}>signaled</span>
                  {item.support !== undefined && (
                    <span className={styles.support} style={{ color: getSupportColor(item.support) }}>
                      {getSupportLabel(item.support)}
                    </span>
                  )}
                </>
              )}
            </div>
            {(item.candidateTitle || item.candidateSlug) && (
              <div className={styles.proposal} onClick={handleCandidateClick} role="button" tabIndex={0}>
                {item.candidateTitle || formatSlugToTitle(item.candidateSlug!)}
              </div>
            )}
            {renderReason()}
          </>
        );

      case 'candidate_sponsored':
        return (
          <>
            <div className={styles.header}>
              {renderActor(actorAvatar, displayName, handleActorClick)}
              <span className={styles.action}>sponsored</span>
              {item.candidateTitle && (
                <span className={styles.titleLink}>
                  {item.candidateTitle}
                </span>
              )}
            </div>
            {item.reason && (
              <MarkdownRenderer content={item.reason} className={styles.reason} />
            )}
          </>
        );

      case 'candidate_updated':
        return (
          <>
            <div className={styles.header}>
              {renderActor(actorAvatar, displayName, handleActorClick)}
              <span className={styles.action}>updated</span>
              <span className={styles.badge} data-type="candidate">Candidate</span>
              {item.candidateSlug && (
                <span className={styles.titleLink} onClick={handleCandidateClick} role="button" tabIndex={0}>
                  {item.candidateTitle || formatSlugToTitle(item.candidateSlug)}
                </span>
              )}
            </div>
            {item.updateMessage && (
              <MarkdownRenderer content={item.updateMessage} className={styles.reason} />
            )}
          </>
        );

      case 'noun_transfer':
        // Check if this was a sale (has salePrice)
        if (item.salePrice) {
          const priceInEth = Number(formatEther(BigInt(item.salePrice))).toFixed(3);
          return (
            <div className={styles.header}>
              {renderActor(actorAvatar, displayName, handleActorClick)}
              <span className={styles.action}>sold</span>
              {nounId !== undefined && (
                <NounImageById id={nounId} size={22} className={styles.nounImageInline} />
              )}
              <span className={styles.nounBadge}>Noun <strong>{item.nounId}</strong></span>
              <span className={styles.action}>for</span>
              <span className={styles.salePrice}>{priceInEth} ETH</span>
              <span className={styles.action}>to</span>
              <span className={styles.actor} onClick={handleToAddressClick} role="button" tabIndex={0}>
                {item.toAddress && formatAddress(item.toAddress, toAddressEns)}
              </span>
            </div>
          );
        }
        
        // Regular transfer (not a sale)
        return (
          <div className={styles.header}>
            <span className={styles.actor} onClick={handleActorClick} role="button" tabIndex={0}>
              {displayName}
            </span>
            <span className={styles.action}>transferred</span>
            {nounId !== undefined && (
              <NounImageById id={nounId} size={22} className={styles.nounImageInline} />
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
              <NounImageById id={nounId} size={22} className={styles.nounImageInline} />
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
              <NounImageById id={nounId} size={64} className={styles.nounImage} />
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
                size={64} 
                className={`${styles.nounImage} ${styles.clickable}`} 
                onClick={handleAuctionClick}
              />
            )}
            <div className={styles.nounContent}>
              <div className={styles.header}>
                <span className={styles.nounBadge}>Noun <strong>{item.nounId}</strong></span>
                <span className={styles.action}>auction started</span>
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
