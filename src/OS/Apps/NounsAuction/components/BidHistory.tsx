/**
 * BidHistory Component
 * Displays list of bids for an auction
 */

'use client';

import { useTranslation } from '@/OS/lib/i18n';
import type { Bid } from '../hooks/useAuctionData';
import { formatBidAmount } from '../utils/auctionHelpers';
import { getClientName, isBerryOSClient } from '@/OS/lib/clientNames';
import { BidderDisplay } from './BidderDisplay';
import styles from './BidHistory.module.css';

interface BidHistoryProps {
  bids: Bid[];
  isNounderNoun?: boolean;
  loading?: boolean;
}

export function BidHistory({ bids, isNounderNoun = false, loading = false }: BidHistoryProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className={styles.bidHistory}>
        <h3 className={styles.title}>{t('auction.bidHistory')}</h3>
        <div className={styles.bidsList}>
          <div className={styles.bidItem}>
            <span className={styles.loadingText}>{t('common.loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  // Nounder Nouns display nounders.eth
  if (isNounderNoun) {
    return (
      <div className={styles.bidHistory}>
        <h3 className={styles.title}>{t('auction.bidHistory')}</h3>
        <div className={styles.bidsList}>
          <div className={styles.bidItem}>
            <BidderDisplay address="0x2573C60a6D127755aA2DC85e342F7da2378a0Cc5" />
            <div className={styles.bidDetails}>
              <span className={styles.bidAmount}>nounders.eth</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No bids yet
  if (!bids || bids.length === 0) {
    return (
      <div className={styles.bidHistory}>
        <h3 className={styles.title}>{t('auction.bidHistory')}</h3>
        <div className={styles.bidsList}>
          <p className={styles.noBids}>{t('auction.noBids')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.bidHistory}>
      <h3 className={styles.title}>{t('auction.bidHistory')}</h3>
      <div className={styles.scrollContainer}>
        <div className={styles.bidsList}>
          {bids.map((bid) => {
            const clientName = getClientName(bid.clientId);
            const isBerryBid = isBerryOSClient(bid.clientId);
            
            return (
              <div key={bid.id} className={styles.bidItem}>
                <div className={styles.bidderSection}>
                  <BidderDisplay address={bid.bidder.id} />
                  {clientName && (
                    <span className={`${styles.clientBadge} ${isBerryBid ? styles.berryBadge : ''}`}>
                      {clientName}
                    </span>
                  )}
                </div>
                <div className={styles.bidDetails}>
                  <span className={styles.bidAmount}>
                    Ξ {formatBidAmount(bid.amount)}
                  </span>
                  {bid.txHash && (
                    <a
                      href={`https://etherscan.io/tx/${bid.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.viewTx}
                      aria-label="View transaction"
                    >
                      ↗
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

