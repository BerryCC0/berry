/**
 * Live NounV2 auction — bid, watch the countdown, settle.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { V2NounImage } from '../components/V2NounImage';
import { V2TxStatusBanner } from '../components/V2TxStatusBanner';
import { useV2CurrentAuction, useV2AuctionParams } from '../hooks/useV2CurrentAuction';
import { useV2Bid } from '../hooks/useV2Bid';
import { fmtCountdown, fmtEth, minNextBid, truncateAddr } from '../utils/format';
import { useEnsDataBatch, getEnsFromMap } from '@/OS/hooks/useEnsData';
import styles from './AuctionView.module.css';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function AuctionView() {
  const { isConnected } = useAccount();
  const { auction, isLoading } = useV2CurrentAuction();
  const { reservePrice, minBidIncrementPct } = useV2AuctionParams();
  const bid = useV2Bid();

  const [bidInput, setBidInput] = useState('');
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const minNextBidWei = useMemo(() => {
    if (!auction) return BigInt(0);
    return minNextBid(auction.amount, minBidIncrementPct, reservePrice);
  }, [auction, minBidIncrementPct, reservePrice]);

  const minNextBidEth = formatEther(minNextBidWei);

  useEffect(() => {
    if (!bidInput && minNextBidWei > BigInt(0)) {
      setBidInput(minNextBidEth);
    }
  }, [bidInput, minNextBidWei, minNextBidEth]);

  useEffect(() => {
    if (bid.isSuccess) {
      setBidInput('');
      bid.reset();
    }
  }, [bid.isSuccess, bid]);

  const addressesToResolve = useMemo(() => {
    if (!auction || auction.bidder === ZERO_ADDRESS) return [];
    return [auction.bidder];
  }, [auction]);
  const { data: ensMap } = useEnsDataBatch(addressesToResolve);
  const displayAddr = (addr: string) => getEnsFromMap(ensMap, addr).name ?? truncateAddr(addr);

  const isExpired = !!auction && Number(auction.endTime) <= now;
  const canBid = !!auction && !auction.settled && !isExpired && isConnected;
  const canSettle = !!auction && !auction.settled && isExpired;

  const handleBid = () => {
    if (!auction || !bidInput) return;
    bid.placeBid(auction.nounId, bidInput);
  };

  return (
    <div className={styles.view}>
      <div className={styles.main}>
        <div className={styles.imageCol}>
          <V2NounImage tokenId={auction?.nounId ?? null} size={300} />
          <div className={styles.titleRow}>
            <h2 className={styles.title}>
              {auction
                ? `Noun V2 #${auction.nounId.toString()}`
                : isLoading
                  ? 'Loading…'
                  : 'No auction'}
            </h2>
          </div>
        </div>

        <div className={styles.detailsCol}>
          <div className={styles.statusGrid}>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>{auction?.settled ? 'Winning bid' : 'Current bid'}</div>
              <div className={styles.statusValue}>
                {auction ? `Ξ ${fmtEth(auction.amount)}` : '—'}
              </div>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>{isExpired ? 'Ended' : 'Ends in'}</div>
              <div className={styles.statusValue}>
                {auction ? fmtCountdown(auction.endTime) : '—'}
              </div>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>Top bidder</div>
              <div className={styles.statusValue}>
                {auction && auction.bidder !== ZERO_ADDRESS
                  ? displayAddr(auction.bidder)
                  : 'No bids yet'}
              </div>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>Min next bid</div>
              <div className={styles.statusValue}>
                {auction ? `Ξ ${fmtEth(minNextBidWei)}` : '—'}
              </div>
            </div>
          </div>

          {canBid && (
            <div className={styles.bidRow}>
              <label className={styles.bidInputLabel}>
                <span>Bid (ETH)</span>
                <input
                  type="number"
                  step="0.0001"
                  min={minNextBidEth}
                  className={styles.bidInput}
                  value={bidInput}
                  onChange={(e) => setBidInput(e.target.value)}
                  disabled={bid.isPending || bid.isConfirming}
                />
              </label>
              <button
                type="button"
                className={styles.bidButton}
                disabled={!bidInput || bid.isPending || bid.isConfirming}
                onClick={handleBid}
              >
                {bid.isPending || bid.isConfirming ? 'Bidding…' : 'Place Bid'}
              </button>
            </div>
          )}

          {canSettle && (
            <div className={styles.settleRow}>
              <button
                type="button"
                className={styles.settleButton}
                disabled={bid.isPending || bid.isConfirming || !isConnected}
                onClick={() => bid.settle()}
              >
                {bid.isPending || bid.isConfirming
                  ? 'Settling…'
                  : 'Settle & Start Next Auction'}
              </button>
              {!isConnected && (
                <span className={styles.settleHint}>Connect a wallet to settle.</span>
              )}
            </div>
          )}

          {!canBid && !canSettle && !isConnected && auction && !auction.settled && !isExpired && (
            <div className={styles.connectHint}>Connect a wallet to bid.</div>
          )}

          <V2TxStatusBanner
            hash={bid.hash ?? null}
            isPending={bid.isPending}
            isConfirming={bid.isConfirming}
            isSuccess={bid.isSuccess}
            error={bid.error}
            onDismiss={bid.reset}
            successMessage="Transaction confirmed."
          />
        </div>
      </div>

      <section className={styles.historySection}>
        <h3 className={styles.historyTitle}>Recent settled auctions</h3>
        <div className={styles.empty}>
          History indexer is syncing. Once <code>ponder_live.nouns_v2_auctions</code> populates,
          settled-auction history will appear here.
        </div>
      </section>
    </div>
  );
}
