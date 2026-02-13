/**
 * ActivityItem Component
 * Displays a single activity feed item
 * 
 * Business logic (ENS resolution, reply/repost detection, time formatting)
 * is in the useActivityItemData hook.
 * This file contains only presentation logic.
 * 
 * Supports:
 * - Votes and proposal feedback/signals
 * - Proposal and candidate creation
 * - Noun transfers and delegations
 * - Auction starts and settlements
 */

'use client';

import { formatEther } from 'viem';
import { NounImageById } from '@/app/lib/nouns/components';
import { useTranslation } from '@/OS/lib/i18n';
import { getSupportLabel, getSupportColor, type ActivityItem as ActivityItemType } from '../types';
import { getClientName } from '@/OS/lib/clientNames';
import { formatSlugToTitle } from '../utils/formatUtils';
import { useActivityItemData } from '../hooks/useActivityItemData';
import { useSalePrice } from '../hooks/useSalePrice';
import { MarkdownRenderer } from './MarkdownRenderer';
import styles from './ActivityItem.module.css';

interface ActivityItemProps {
  item: ActivityItemType;
  allItems?: ActivityItemType[];
  onClickProposal?: (id: string) => void;
  onClickVoter?: (address: string) => void;
  onClickCandidate?: (proposer: string, slug: string) => void;
  onClickAuction?: (nounId: string) => void;
}

export function ActivityItem({ item, allItems, onClickProposal, onClickVoter, onClickCandidate, onClickAuction }: ActivityItemProps) {
  const { t } = useTranslation();
  
  // All ENS resolution, reply/repost detection, and computed values from hook
  const {
    actorAvatar,
    toAddressEns,
    winnerEns,
    settlerEns,
    replyOriginalPosterEns,
    repostOriginalPosterEns,
    replyOriginalPosterAddress,
    repostOriginalPosterAddress,
    displayName,
    timeAgo,
    nounId,
    repostInfo,
    replyInfo,
    fromContractLabel,
    toContractLabel,
    isFromContract,
    isToContract,
    formatAddr,
  } = useActivityItemData(item, allItems);

  // Lazy sale detection for noun transfers
  // For bulk transfers, don't pass a specific seller so we get the total price
  const isTransfer = item.type === 'noun_transfer';
  const { isSale, salePrice } = useSalePrice(
    isTransfer ? item.txHash : undefined,
    isTransfer && !item.isBulkTransfer ? item.fromAddress : undefined
  );

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
    if (item.candidateSlug) {
      onClickCandidate?.(item.candidateProposer || '', item.candidateSlug);
    }
  };

  // Render the reason content - handles reposts and replies specially
  const renderReason = () => {
    // Don't render anything if there's no reason or it's just whitespace
    if (!item.reason || !item.reason.trim()) return null;

    // If it's a repost (+1 with quote), show who they're reposting and the content
    if (repostInfo) {
      // Use resolved ENS name if available, otherwise use the address
      const repostAuthorDisplay = repostOriginalPosterEns 
        || (repostOriginalPosterAddress ? formatAddr(repostOriginalPosterAddress, null) : null);
      
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
        || (replyOriginalPosterAddress ? formatAddr(replyOriginalPosterAddress, null) : replyInfo.targetAuthor);
      
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
              {item.clientId != null && item.clientId !== 0 && (
                <span className={styles.clientBadge}>
                  via {getClientName(item.clientId)}
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
            {item.clientId != null && item.clientId !== 0 && (
              <span className={styles.clientBadge}>
                via {getClientName(item.clientId)}
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
              {(item.candidateTitle || item.candidateSlug) && (
                <span className={styles.titleLink} onClick={handleCandidateClick} role="button" tabIndex={0}>
                  {item.candidateTitle || formatSlugToTitle(item.candidateSlug!)}
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

      case 'noun_transfer': {
        // Check if this was a sale (from hook or pre-populated)
        const effectiveSalePrice = salePrice || item.salePrice;

        // Bulk transfer: multiple nouns in one transaction
        if (item.isBulkTransfer && item.nounIds && item.fromAddresses) {
          const nounCount = item.nounIds.length;
          const sellerList = item.fromAddresses.map(addr => formatAddr(addr, null));
          const sellersDisplay = sellerList.length <= 2
            ? sellerList.join(' and ')
            : `${sellerList.length} sellers`;

          if (isSale && effectiveSalePrice) {
            const priceInEth = Number(formatEther(BigInt(effectiveSalePrice))).toFixed(2);
            return (
              <div className={styles.header}>
                {renderActor(actorAvatar, displayName, handleActorClick)}
                <span className={styles.action}>bought</span>
                <span className={styles.action}>{nounCount} nouns</span>
                {item.nounIds.map(id => (
                  <NounImageById key={id} id={parseInt(id, 10)} size={22} className={styles.nounImageInline} />
                ))}
                <span className={styles.action}>from</span>
                <span className={styles.action}>{sellersDisplay}</span>
                <span className={styles.action}>for</span>
                <span className={styles.salePrice}>{priceInEth} ETH</span>
              </div>
            );
          }

          // Bulk transfer (not a sale)
          return (
            <div className={styles.header}>
              {renderActor(actorAvatar, displayName, handleActorClick)}
              <span className={styles.action}>received</span>
              <span className={styles.action}>{nounCount} nouns</span>
              {item.nounIds.map(id => (
                <NounImageById key={id} id={parseInt(id, 10)} size={22} className={styles.nounImageInline} />
              ))}
              <span className={styles.action}>from</span>
              <span className={styles.action}>{sellersDisplay}</span>
            </div>
          );
        }

        // Single transfer sale
        if (isSale && effectiveSalePrice) {
          const priceInEth = Number(formatEther(BigInt(effectiveSalePrice))).toFixed(3);
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
                {item.toAddress && formatAddr(item.toAddress, toAddressEns)}
              </span>
            </div>
          );
        }
        
        // Withdrew from contract (from is contract, to is EOA)
        if (isFromContract && !isToContract) {
          return (
            <div className={styles.header}>
              {renderActor(actorAvatar, displayName, handleActorClick)}
              <span className={styles.action}>withdrew</span>
              {nounId !== undefined && (
                <NounImageById id={nounId} size={22} className={styles.nounImageInline} />
              )}
              <span className={styles.nounBadge}>Noun <strong>{item.nounId}</strong></span>
              <span className={styles.action}>from</span>
              <span className={styles.contractLabel}>{fromContractLabel}</span>
            </div>
          );
        }

        // Deposited to contract (from is EOA, to is contract)
        if (!isFromContract && isToContract) {
          return (
            <div className={styles.header}>
              {renderActor(actorAvatar, displayName, handleActorClick)}
              <span className={styles.action}>deposited</span>
              {nounId !== undefined && (
                <NounImageById id={nounId} size={22} className={styles.nounImageInline} />
              )}
              <span className={styles.nounBadge}>Noun <strong>{item.nounId}</strong></span>
              <span className={styles.action}>to</span>
              <span className={styles.contractLabel}>{toContractLabel}</span>
            </div>
          );
        }
        
        // Regular transfer (EOA to EOA, or contract to contract)
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
              {item.toAddress && formatAddr(item.toAddress, toAddressEns)}
            </span>
          </div>
        );
      }

      case 'noun_delegation': {
        // Multiple nouns delegated
        if (item.nounIds && item.nounIds.length > 0) {
          return (
            <div className={styles.header}>
              {renderActor(actorAvatar, displayName, handleActorClick)}
              <span className={styles.action}>delegated</span>
              {item.nounIds.map(id => (
                <NounImageById key={id} id={parseInt(id, 10)} size={22} className={styles.nounImageInline} />
              ))}
              <span className={styles.action}>{item.nounIds.length} {item.nounIds.length === 1 ? 'noun' : 'nouns'}</span>
              <span className={styles.action}>to</span>
              <span className={styles.actor} onClick={handleToAddressClick} role="button" tabIndex={0}>
                {item.toAddress && formatAddr(item.toAddress, toAddressEns)}
              </span>
            </div>
          );
        }

        // Single noun delegated
        return (
          <div className={styles.header}>
            {renderActor(actorAvatar, displayName, handleActorClick)}
            <span className={styles.action}>delegated</span>
            {nounId !== undefined && (
              <NounImageById id={nounId} size={22} className={styles.nounImageInline} />
            )}
            {item.nounId ? (
              <span className={styles.nounBadge}>Noun <strong>{item.nounId}</strong></span>
            ) : (
              <span className={styles.action}>votes</span>
            )}
            <span className={styles.action}>to</span>
            <span className={styles.actor} onClick={handleToAddressClick} role="button" tabIndex={0}>
              {item.toAddress && formatAddr(item.toAddress, toAddressEns)}
            </span>
          </div>
        );
      }

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
                  {item.winner && formatAddr(item.winner, winnerEns)}
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
                      {formatAddr(item.settler, settlerEns)}
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
                    {formatAddr(item.settler, settlerEns)}
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
