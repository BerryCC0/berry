/**
 * V2 auction bid history. Bids come from the indexer (nouns_v2_auction_bids),
 * highest first. V2's AuctionBid event carries no clientId, so — unlike the V1
 * auction app — there are no client attribution badges.
 */

'use client';

import { useMemo } from 'react';
import { useEnsDataBatch, getEnsFromMap } from '@/OS/hooks/useEnsData';
import { fmtEth, truncateAddr } from '../utils/format';
import { v2TxLink } from '../contracts';
import type { V2BidRow } from '../hooks/useV2AuctionHistory';
import styles from './V2BidHistory.module.css';

interface Props {
  bids: V2BidRow[];
  loading?: boolean;
}

export function V2BidHistory({ bids, loading = false }: Props) {
  const addresses = useMemo(() => bids.map((b) => b.bidder), [bids]);
  const { data: ensMap } = useEnsDataBatch(addresses);

  return (
    <div className={styles.history}>
      <h3 className={styles.title}>Bid History</h3>
      {loading ? (
        <p className={styles.empty}>Loading…</p>
      ) : bids.length === 0 ? (
        <p className={styles.empty}>No bids yet.</p>
      ) : (
        <div className={styles.scroll}>
          <div className={styles.list}>
            {bids.map((bid) => {
              const ens = getEnsFromMap(ensMap, bid.bidder);
              return (
                <div key={bid.id} className={styles.item}>
                  <div className={styles.bidder}>
                    {ens.avatar && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ens.avatar} alt="" className={styles.avatar} />
                    )}
                    <span className={styles.bidderName}>
                      {ens.name ?? truncateAddr(bid.bidder)}
                    </span>
                    {bid.extended && <span className={styles.extendedBadge}>extended</span>}
                  </div>
                  <div className={styles.details}>
                    <span className={styles.amount}>Ξ {fmtEth(bid.amount)}</span>
                    {bid.txHash && (
                      <a
                        href={v2TxLink(bid.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.tx}
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
      )}
    </div>
  );
}
