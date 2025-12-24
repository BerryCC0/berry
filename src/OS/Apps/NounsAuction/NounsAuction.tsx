/**
 * Nouns Auction App
 * Participate in the daily Nouns auction
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { NounImage } from '@/app/lib/nouns/components';
import { useCurrentAuction, useAuctionById, useNounById } from './hooks/useAuctionData';
import { AuctionNavigation, BidButton, BidHistory, TraitsList } from './components';
import {
  formatCountdown,
  formatTimestamp,
  getTimeRemaining,
  isNounderNoun,
  formatBidAmount,
  getMinimumNextBid,
  isAuctionActive,
  truncateAddress,
} from './utils/auctionHelpers';
import styles from './NounsAuction.module.css';

interface NounsAuctionProps {
  windowId: string;
}

export function NounsAuction({ windowId }: NounsAuctionProps) {
  const [viewingNounId, setViewingNounId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>('');

  // Determine if viewing current auction or historical
  const isViewingCurrent = !viewingNounId;

  // Query current auction
  const { data: currentData, isLoading: currentLoading } = useCurrentAuction(5000);

  // Check if viewing a Nounder Noun
  const isNounder = viewingNounId ? isNounderNoun(viewingNounId) : false;

  // Query historical auction (skip if Nounder Noun)
  const { data: historicalData, isLoading: historicalLoading } = useAuctionById(
    viewingNounId && !isNounder ? viewingNounId : null
  );

  // Query Nounder Noun directly (only for Nounder Nouns)
  const { data: nounderNounData, isLoading: nounderLoading } = useNounById(
    viewingNounId && isNounder ? viewingNounId : null
  );

  // Get current auction for navigation reference
  const currentAuction = currentData?.auctions?.[0];
  const currentAuctionId = currentAuction?.noun?.id;

  // Determine which auction to display
  const displayAuction = useMemo(() => {
    if (isViewingCurrent) {
      return currentAuction || null;
    }
    
    if (isNounder && nounderNounData?.noun) {
      // For Nounder Nouns, create a fake auction structure
      return {
        id: nounderNounData.noun.id,
        amount: '0',
        startTime: '0',
        endTime: '0',
        settled: true,
        noun: nounderNounData.noun,
        bids: [],
      };
    }
    
    return historicalData?.auction || null;
  }, [isViewingCurrent, currentAuction, historicalData, isNounder, nounderNounData]);

  const loading = isViewingCurrent 
    ? currentLoading 
    : isNounder 
      ? nounderLoading 
      : historicalLoading;

  // Update countdown timer for active auctions
  useEffect(() => {
    if (!displayAuction || !isViewingCurrent) return;
    
    const updateCountdown = () => {
      const remaining = getTimeRemaining(displayAuction.endTime);
      setCountdown(formatCountdown(remaining));
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(timer);
  }, [displayAuction, isViewingCurrent]);

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    const currentId = viewingNounId || currentAuctionId;
    if (!currentId) return;
    
    const prevId = String(Math.max(1, Number(currentId) - 1));
    setViewingNounId(prevId === currentAuctionId ? null : prevId);
  }, [viewingNounId, currentAuctionId]);

  const handleNext = useCallback(() => {
    if (!viewingNounId || !currentAuctionId) return;
    
    const nextId = String(Math.min(Number(currentAuctionId), Number(viewingNounId) + 1));
    setViewingNounId(nextId === currentAuctionId ? null : nextId);
  }, [viewingNounId, currentAuctionId]);

  const handleSearch = useCallback((nounId: string) => {
    if (!currentAuctionId) return;
    setViewingNounId(nounId === currentAuctionId ? null : nounId);
  }, [currentAuctionId]);

  const handleCurrent = useCallback(() => {
    setViewingNounId(null);
  }, []);

  // Calculate minimum next bid
  const minBidETH = useMemo(() => {
    if (!displayAuction) return '0';
    const minBid = getMinimumNextBid(displayAuction.amount);
    return formatBidAmount(minBid.toString());
  }, [displayAuction]);

  // Get display values
  const nounTitle = useMemo(() => {
    if (loading) return 'Loading...';
    if (!displayAuction) return 'No auction data';
    return `Noun ${displayAuction.noun.id}`;
  }, [loading, displayAuction]);

  const currentBidETH = displayAuction?.amount 
    ? formatBidAmount(displayAuction.amount) 
    : '0';

  const ownerAddress = useMemo(() => {
    if (viewingNounId && isNounderNoun(viewingNounId)) {
      return '0x2573C60a6D127755aA2DC85e342F7da2378a0Cc5';
    }
    return displayAuction?.noun?.owner?.id || '';
  }, [viewingNounId, displayAuction]);

  const auctionIsActive = displayAuction 
    ? isAuctionActive(displayAuction.endTime, displayAuction.settled)
    : false;

  return (
    <div className={styles.auction}>
      <AuctionNavigation
        currentNounId={currentAuctionId || null}
        viewingNounId={viewingNounId}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSearch={handleSearch}
        onCurrent={handleCurrent}
      />

      <div className={styles.content}>
        {/* Left: Noun Image & Traits */}
        <div className={styles.imageSection}>
          {displayAuction?.noun?.seed ? (
            <NounImage 
              seed={{
                background: Number(displayAuction.noun.seed.background),
                body: Number(displayAuction.noun.seed.body),
                accessory: Number(displayAuction.noun.seed.accessory),
                head: Number(displayAuction.noun.seed.head),
                glasses: Number(displayAuction.noun.seed.glasses),
              }}
              size={280}
              className={styles.nounImage}
            />
          ) : (
            <div className={styles.placeholder}>⌐◨-◨</div>
          )}
          <TraitsList seed={displayAuction?.noun?.seed || null} loading={loading} />
        </div>

        {/* Right: Auction Details */}
        <div className={styles.detailsSection}>
          <div className={styles.header}>
            <h1 className={styles.title}>{nounTitle}</h1>
            {viewingNounId && !isNounder && displayAuction?.endTime && (
              <div className={styles.endDate}>
                <span className={styles.endDateLabel}>Ended</span>
                <span>{formatTimestamp(displayAuction.endTime)}</span>
              </div>
            )}
          </div>

          <div className={styles.statusGrid}>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>
                {isNounder ? 'Status' : (viewingNounId ? 'Winning Bid' : 'Current Bid')}
              </div>
              <div className={styles.statusValue}>
                {loading ? '...' : (isNounder ? 'Not Auctioned' : `Ξ ${currentBidETH}`)}
              </div>
            </div>

            {!viewingNounId && displayAuction ? (
              <div className={styles.statusItem}>
                <div className={styles.statusLabel}>Ends in</div>
                <div className={styles.statusValue}>
                  {loading ? '...' : countdown}
                </div>
              </div>
            ) : (
              <div className={styles.statusItem}>
                <div className={styles.statusLabel}>Owner</div>
                <div className={styles.statusValue}>
                  {loading ? '...' : (
                    isNounder ? 'nounders.eth' : truncateAddress(ownerAddress)
                  )}
                </div>
              </div>
            )}
          </div>

          {!viewingNounId && displayAuction && (
            <BidButton
              nounId={displayAuction.noun.id}
              currentBidETH={currentBidETH}
              minBidETH={minBidETH}
              disabled={!auctionIsActive}
            />
          )}

          <BidHistory
            bids={displayAuction?.bids || []}
            isNounderNoun={isNounder}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}

