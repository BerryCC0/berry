/**
 * NounV2 auction — live bidding + settle, plus historical browsing.
 *
 * Live auction state (amount / bidder / countdown / settled) is read in
 * real time from the auction-house contract. Everything historical — traits,
 * bid history, winner, settler — comes from the indexer via the API routes.
 * Feature parity with the V1 Nouns auction app, adapted to V2's data path.
 */

'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { V2NounImage } from '../components/V2NounImage';
import { V2TxStatusBanner } from '../components/V2TxStatusBanner';
import { V2AuctionNav } from '../components/V2AuctionNav';
import { V2TraitsList } from '../components/V2TraitsList';
import { V2BidHistory } from '../components/V2BidHistory';
import { CrystalBallView } from './CrystalBallView';
import { useV2CurrentAuction, useV2AuctionParams } from '../hooks/useV2CurrentAuction';
import { useV2Bid } from '../hooks/useV2Bid';
import { useV2AuctionDetail } from '../hooks/useV2AuctionHistory';
import { fmtCountdown, fmtEth, fmtTimestamp, minNextBid, truncateAddr } from '../utils/format';
import { useEnsDataBatch, getEnsFromMap } from '@/OS/hooks/useEnsData';
import styles from './AuctionView.module.css';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function AuctionView() {
  const { isConnected } = useAccount();
  const { auction: live, isLoading: liveLoading } = useV2CurrentAuction();
  const { reservePrice, minBidIncrementPct } = useV2AuctionParams();
  const bid = useV2Bid();

  const [viewingNounId, setViewingNounId] = useState<number | null>(null);
  const [bidInput, setBidInput] = useState('');
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const currentNounId = live ? Number(live.nounId) : null;
  const isViewingCurrent = viewingNounId == null;
  const displayNounId = isViewingCurrent ? currentNounId : viewingNounId;

  // Full detail (traits + bids + winner/settler) for whichever noun is shown.
  // Poll the live auction's bids; historical detail is static.
  const detail = useV2AuctionDetail(displayNounId, isViewingCurrent ? 12_000 : 0);

  const histAuction = detail.data?.auction ?? null;
  const nounRow = detail.data?.noun ?? null;
  const bids = detail.data?.bids ?? [];

  // ---- Unified display state (live contract read vs. indexed history) -------
  const amountWei: bigint | null = isViewingCurrent
    ? live
      ? live.amount
      : null
    : histAuction?.amount != null
      ? BigInt(histAuction.amount)
      : null;

  const settled = isViewingCurrent ? (live?.settled ?? false) : (histAuction?.settled ?? false);
  const isExpired = isViewingCurrent ? !!live && Number(live.endTime) <= now : true;
  // A minted noun with no auction row (e.g. a founder reward) was never auctioned.
  const wasAuctioned = isViewingCurrent ? true : !!histAuction;

  // ---- Minimum next bid (live only) -----------------------------------------
  const minNextBidWei = useMemo(() => {
    if (!live) return BigInt(0);
    return minNextBid(live.amount, minBidIncrementPct, reservePrice);
  }, [live, minBidIncrementPct, reservePrice]);
  const minNextBidEth = formatEther(minNextBidWei);

  useEffect(() => {
    if (isViewingCurrent && !bidInput && minNextBidWei > BigInt(0)) {
      setBidInput(minNextBidEth);
    }
  }, [isViewingCurrent, bidInput, minNextBidWei, minNextBidEth]);

  useEffect(() => {
    if (bid.isSuccess) {
      setBidInput('');
      bid.reset();
    }
  }, [bid.isSuccess, bid]);

  // ---- ENS resolution (top bidder / winner / settler / owner / grid) --------
  const addressesToResolve = useMemo(() => {
    const set = new Set<string>();
    if (isViewingCurrent && live && live.bidder !== ZERO_ADDRESS) set.add(live.bidder);
    if (histAuction?.winner) set.add(histAuction.winner);
    if (histAuction?.settlerAddress) set.add(histAuction.settlerAddress);
    if (nounRow?.owner) set.add(nounRow.owner);
    return [...set].filter((a) => a && a !== ZERO_ADDRESS);
  }, [isViewingCurrent, live, histAuction, nounRow]);
  const { data: ensMap } = useEnsDataBatch(addressesToResolve);
  const displayAddr = useCallback(
    (addr?: string | null) =>
      addr && addr !== ZERO_ADDRESS
        ? (getEnsFromMap(ensMap, addr).name ?? truncateAddr(addr))
        : '—',
    [ensMap]
  );

  // ---- Actions (live only) --------------------------------------------------
  const canBid = isViewingCurrent && !!live && !live.settled && !isExpired && isConnected;
  const canSettle = isViewingCurrent && !!live && !live.settled && isExpired;

  const handleBid = () => {
    if (!live || !bidInput) return;
    bid.placeBid(live.nounId, bidInput);
  };

  // ---- Navigation -----------------------------------------------------------
  const handlePrevious = useCallback(() => {
    if (displayNounId == null) return;
    const prev = Math.max(0, displayNounId - 1);
    setViewingNounId(prev === currentNounId ? null : prev);
  }, [displayNounId, currentNounId]);

  const handleNext = useCallback(() => {
    if (viewingNounId == null || currentNounId == null) return;
    const next = Math.min(currentNounId, viewingNounId + 1);
    setViewingNounId(next === currentNounId ? null : next);
  }, [viewingNounId, currentNounId]);

  const handleSearch = useCallback(
    (id: number) => setViewingNounId(id === currentNounId ? null : id),
    [currentNounId]
  );
  const handleCurrent = useCallback(() => setViewingNounId(null), []);

  const title =
    displayNounId != null
      ? `Noun V2 #${displayNounId}`
      : liveLoading
        ? 'Loading…'
        : 'No auction';

  return (
    <div className={styles.view}>
      <V2AuctionNav
        currentNounId={currentNounId}
        viewingNounId={viewingNounId}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSearch={handleSearch}
        onCurrent={handleCurrent}
      />

      {/* Auction ended, awaiting settlement → become the Crystal Ball: predict
          the next noun from the current block hash and offer to settle. */}
      {canSettle ? (
        <CrystalBallView />
      ) : (
      <div className={styles.main}>
        <div className={styles.imageCol}>
          <V2NounImage
            tokenId={displayNounId != null ? BigInt(displayNounId) : null}
            size={300}
          />
          <div className={styles.titleRow}>
            <h2 className={styles.title}>{title}</h2>
          </div>
          <V2TraitsList
            seed={
              nounRow
                ? {
                    background: nounRow.background,
                    body: nounRow.body,
                    accessory: nounRow.accessory,
                    head: nounRow.head,
                    glasses: nounRow.glasses,
                  }
                : null
            }
            isSlobber={nounRow?.isSlobber}
            loading={detail.isLoading}
          />
        </div>

        <div className={styles.detailsCol}>
          <div className={styles.statusGrid}>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>{settled ? 'Winning bid' : 'Current bid'}</div>
              <div className={styles.statusValue}>
                {!wasAuctioned ? 'Not auctioned' : amountWei != null ? `Ξ ${fmtEth(amountWei)}` : '—'}
              </div>
            </div>

            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>
                {isViewingCurrent && !isExpired ? 'Ends in' : 'Ended'}
              </div>
              <div className={styles.statusValue}>
                {isViewingCurrent
                  ? live
                    ? fmtCountdown(live.endTime)
                    : '—'
                  : histAuction?.settledTimestamp
                    ? fmtTimestamp(histAuction.settledTimestamp)
                    : histAuction?.endTime
                      ? fmtTimestamp(histAuction.endTime)
                      : '—'}
              </div>
            </div>

            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>
                {isViewingCurrent ? 'Top bidder' : settled ? 'Winner' : 'Owner'}
              </div>
              <div className={styles.statusValue}>
                {isViewingCurrent
                  ? live && live.bidder !== ZERO_ADDRESS
                    ? displayAddr(live.bidder)
                    : 'No bids yet'
                  : settled
                    ? displayAddr(histAuction?.winner)
                    : displayAddr(nounRow?.owner)}
              </div>
            </div>

            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>
                {isViewingCurrent ? 'Min next bid' : 'Settled by'}
              </div>
              <div className={styles.statusValue}>
                {isViewingCurrent
                  ? live
                    ? `Ξ ${fmtEth(minNextBidWei)}`
                    : '—'
                  : displayAddr(histAuction?.settlerAddress)}
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

          {isViewingCurrent &&
            !canBid &&
            !canSettle &&
            !isConnected &&
            live &&
            !live.settled &&
            !isExpired && <div className={styles.connectHint}>Connect a wallet to bid.</div>}

          {isViewingCurrent && (
            <V2TxStatusBanner
              hash={bid.hash ?? null}
              isPending={bid.isPending}
              isConfirming={bid.isConfirming}
              isSuccess={bid.isSuccess}
              error={bid.error}
              onDismiss={bid.reset}
              successMessage="Transaction confirmed."
            />
          )}

          <V2BidHistory bids={bids} loading={detail.isLoading} />
        </div>
      </div>
      )}
    </div>
  );
}
