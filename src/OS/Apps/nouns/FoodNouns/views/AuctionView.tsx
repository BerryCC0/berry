/**
 * Live Food Nouns auction — bid, watch the countdown, settle.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { FNNounImage } from '../components/FNNounImage';
import { TxStatusBanner } from '../components/TxStatusBanner';
import { useFNCurrentAuction, useFNAuctionParams } from '../hooks/useFNCurrentAuction';
import { useFNAuctionHistory } from '../hooks/useFNAuctionHistory';
import { useFNBid } from '../hooks/useFNBid';
import { fmtCountdown, fmtEth, minNextBid, truncateAddr } from '../utils/format';
import { fnTxLink } from '../contracts';
import { useEnsDataBatch, getEnsFromMap } from '@/OS/hooks/useEnsData';
import styles from './AuctionView.module.css';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function AuctionView() {
  const { isConnected } = useAccount();
  const { auction, isLoading } = useFNCurrentAuction();
  const { reservePrice, minBidIncrementPct } = useFNAuctionParams();
  const history = useFNAuctionHistory(20);
  const bid = useFNBid();

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

  // Auto-fill the input when auction loads or new bid comes in.
  useEffect(() => {
    if (!bidInput && minNextBidWei > BigInt(0)) {
      setBidInput(minNextBidEth);
    }
  }, [bidInput, minNextBidWei, minNextBidEth]);

  // Reset input after a successful bid.
  useEffect(() => {
    if (bid.isSuccess) {
      setBidInput('');
      bid.reset();
    }
  }, [bid.isSuccess, bid]);

  // Batch-resolve ENS for the current top bidder + every history winner in
  // a single round trip (Ponder cache → ENSIdeas fallback).
  const addressesToResolve = useMemo(() => {
    const out: string[] = [];
    if (auction && auction.bidder !== ZERO_ADDRESS) out.push(auction.bidder);
    for (const row of history.data ?? []) {
      if (row.winner !== ZERO_ADDRESS) out.push(row.winner);
    }
    return out;
  }, [auction, history.data]);
  const { data: ensMap } = useEnsDataBatch(addressesToResolve);
  const displayAddr = (addr: string) =>
    getEnsFromMap(ensMap, addr).name ?? truncateAddr(addr);

  const isExpired = !!auction && Number(auction.endTime) <= now;
  const canBid = !!auction && !auction.settled && !isExpired && isConnected;
  const canSettle = !!auction && !auction.settled && isExpired;

  const handleBid = () => {
    if (!auction || !bidInput) return;
    bid.placeBid(auction.nounId, bidInput);
  };

  const handleSettle = () => {
    bid.settle();
  };

  return (
    <div className={styles.view}>
      <div className={styles.main}>
        <div className={styles.imageCol}>
          <FNNounImage tokenId={auction?.nounId ?? null} size={300} />
          <div className={styles.titleRow}>
            <h2 className={styles.title}>
              {auction ? `Food Noun #${auction.nounId.toString()}` : isLoading ? 'Loading…' : 'No auction'}
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
                onClick={handleSettle}
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

          <TxStatusBanner
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
        {history.isLoading ? (
          <div className={styles.empty}>Loading history…</div>
        ) : history.error ? (
          <div className={styles.empty}>Couldn&apos;t load history.</div>
        ) : !history.data || history.data.length === 0 ? (
          <div className={styles.empty}>No settled auctions yet.</div>
        ) : (
          <div className={styles.historyTable}>
            <div className={`${styles.historyRow} ${styles.historyHeader}`}>
              <span>Noun</span>
              <span>Winner</span>
              <span>Amount</span>
              <span>Tx</span>
            </div>
            {history.data.map((row) => (
              <div className={styles.historyRow} key={`${row.txHash}-${row.nounId}`}>
                <span className={styles.historyNoun}>#{row.nounId.toString()}</span>
                <span className={styles.historyAddr}>{displayAddr(row.winner)}</span>
                <span className={styles.historyAmount}>Ξ {fmtEth(row.amount)}</span>
                <a
                  className={styles.historyLink}
                  href={fnTxLink(row.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ↗
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
