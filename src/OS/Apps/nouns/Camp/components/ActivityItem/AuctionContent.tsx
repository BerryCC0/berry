/**
 * Auction activity content.
 * Handles: auction_settled, auction_started
 */

'use client';

import { formatEther } from 'viem';
import { NounImageById } from '@/app/lib/nouns/components';
import type { ActivityContentProps } from './types';
import styles from './ActivityItem.module.css';

export function AuctionContent(props: ActivityContentProps) {
  const {
    item,
    winnerEns,
    settlerEns,
    nounId,
    formatAddr,
    onClickActor,
    onClickVoter,
    onClickAuction,
  } = props;

  if (item.type === 'auction_settled') {
    const handleSettlerClick = () => {
      if (item.settler) onClickVoter?.(item.settler);
    };

    return (
      <div className={styles.nounActivity}>
        {nounId !== undefined && (
          <NounImageById id={nounId} size={64} className={styles.nounImage} />
        )}
        <div className={styles.nounContent}>
          <div className={styles.header}>
            <span className={styles.nounBadge}>
              Noun <strong>{item.nounId}</strong>
            </span>
            <span className={styles.action}>won by</span>
            <span className={styles.actor} onClick={onClickActor} role="button" tabIndex={0}>
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
                <span className={styles.actor} onClick={handleSettlerClick} role="button" tabIndex={0}>
                  {formatAddr(item.settler, settlerEns)}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // auction_started
  const handleSettlerClick = () => {
    if (item.settler) onClickVoter?.(item.settler);
  };

  const handleAuctionClick = () => {
    if (item.nounId) onClickAuction?.(item.nounId);
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
          <span className={styles.nounBadge}>
            Noun <strong>{item.nounId}</strong>
          </span>
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
}
