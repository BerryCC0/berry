/**
 * NounDetail Component
 * Full-page Noun detail view inspired by probe.wtf
 * Background fills with the Noun's bg color, large image on right, info on left
 * Shows live auction info + bid input when viewing the current auction Noun
 */

'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { NounImage } from '@/app/lib/nouns/components';
import { getTraitName } from '@/app/lib/nouns/utils/trait-name-utils';
import { ImageData } from '@/app/lib/nouns/utils/image-data';
import type { TraitType } from '@/app/lib/nouns/utils/trait-name-utils';
import { useCurrentAuction, useAuctionTimeRemaining } from '@/app/lib/nouns/hooks';
import { useBid } from '@/app/lib/nouns/hooks';
import { useAuctionById, type Bid } from '@/OS/Apps/NounsAuction/hooks/useAuctionData';
import { getMinimumNextBid, formatBidAmount } from '@/OS/Apps/NounsAuction/utils/auctionHelpers';
import { getClientName, isBerryOSBid } from '@/OS/Apps/NounsAuction/utils/clientNames';
import { useNounDetail, useNounOwner } from '../hooks/useNounDetail';
import styles from './NounDetail.module.css';

interface NounDetailProps {
  nounId: number;
  onBack: () => void;
  onGoBack: () => void;
  onGoForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onFilterByTrait: (type: TraitType, value: number) => void;
}

function truncateAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatBidWei(weiStr: string | null): string {
  if (!weiStr || weiStr === '0') return '';
  const eth = Number(BigInt(weiStr)) / 1e18;
  return `Ξ ${eth.toFixed(2)}`;
}

function formatDateTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    // Filter out placeholder epoch dates (1970-01-01)
    if (isNaN(date.getTime()) || date.getTime() < 86400000) return '';
    const datePart = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timePart = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `on ${datePart} at ${timePart}`;
  } catch {
    return '';
  }
}

function formatBidTime(timestamp: string): string {
  try {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

/**
 * Extract prominent colors from a Noun's traits for the color palette display
 */
function getNounColors(noun: { background: number; body: number; head: number; glasses: number; accessory: number }): string[] {
  const colors: string[] = [];
  const bgHex = ImageData.bgcolors[noun.background];

  const parts = [
    ImageData.images.bodies[noun.body],
    ImageData.images.heads[noun.head],
    ImageData.images.glasses[noun.glasses],
    ImageData.images.accessories[noun.accessory],
  ].filter(Boolean);

  const seen = new Set<string>();
  if (bgHex) seen.add(bgHex);

  for (const part of parts) {
    const data = part.data.replace(/^0x/, '');
    const rects = data.substring(10);
    const pairs = rects.match(/.{1,4}/g) || [];
    for (const pair of pairs) {
      const colorIndex = parseInt(pair.substring(2, 4), 16);
      if (colorIndex === 0) continue;
      const hex = ImageData.palette[colorIndex];
      if (hex && !seen.has(hex)) {
        seen.add(hex);
        colors.push(`#${hex}`);
        if (colors.length >= 5) break;
      }
    }
  }

  // Background color goes last
  if (bgHex) colors.push(`#${bgHex}`);

  return colors;
}

/**
 * Live countdown display
 */
function AuctionCountdown({ endTime }: { endTime: bigint }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const { hours, minutes, seconds, isEnded } = useAuctionTimeRemaining(endTime);

  if (isEnded) return <span>ENDED</span>;
  return <span>{hours}H {minutes}M {seconds}S</span>;
}

/**
 * Bid input section for the current auction
 */
function BidSection({ nounId, currentBidWei }: { nounId: number; currentBidWei: bigint }) {
  const { isConnected } = useAccount();
  const { placeBid, isPending, isConfirming, isSuccess, error } = useBid();
  const [bidAmount, setBidAmount] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const minBidWei = getMinimumNextBid(currentBidWei);
  const minBidEth = Number(formatEther(minBidWei)).toFixed(4);

  const handleBid = () => {
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      setValidationError('Enter a valid bid amount');
      return;
    }
    if (parseFloat(bidAmount) < parseFloat(minBidEth)) {
      setValidationError(`Minimum bid: Ξ ${minBidEth}`);
      return;
    }
    setValidationError(null);
    try {
      placeBid(BigInt(nounId), bidAmount);
      setBidAmount('');
    } catch {
      setValidationError('Invalid bid amount');
    }
  };

  if (!isConnected) {
    return (
      <div className={styles.bidSection}>
        <button className={styles.bidButtonFull} disabled>
          LOGIN TO BID
        </button>
      </div>
    );
  }

  return (
    <div className={styles.bidSection}>
      <div className={styles.bidInputRow}>
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder={`Ξ ${minBidEth} OR MORE`}
          value={bidAmount}
          onChange={(e) => setBidAmount(e.target.value)}
          disabled={isPending || isConfirming}
          className={styles.bidInput}
        />
        <button
          onClick={handleBid}
          disabled={isPending || isConfirming || !bidAmount}
          className={styles.bidButton}
        >
          {isPending || isConfirming ? '...' : 'BID'}
        </button>
      </div>
      {validationError && <div className={styles.bidError}>{validationError}</div>}
      {isSuccess && <div className={styles.bidSuccess}>Bid placed!</div>}
      {error && <div className={styles.bidError}>{error.message || 'Transaction failed'}</div>}
    </div>
  );
}

/**
 * Modal displaying all bids for the current auction
 */
function BidsModal({ bids, onClose }: { bids: Bid[]; onClose: () => void }) {
  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>ALL BIDS</h2>
          <button className={styles.modalClose} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalBody}>
          {bids.length === 0 ? (
            <div className={styles.modalEmpty}>No bids yet</div>
          ) : (
            bids.map((bid) => {
              const clientName = getClientName(bid.clientId);
              const isBerry = isBerryOSBid(bid.clientId);
              const time = formatBidTime(bid.blockTimestamp);

              return (
                <div key={bid.id} className={styles.modalBidRow}>
                  <span className={styles.modalBidAmount}>
                    Ξ {formatBidAmount(bid.amount)}
                  </span>
                  <span className={styles.modalBidSecondary}> BY </span>
                  <span className={styles.modalBidAddress}>
                    {truncateAddress(bid.bidder.id)}
                  </span>
                  {clientName && (
                    <>
                      <span className={styles.modalBidSecondary}> VIA </span>
                      <span className={isBerry ? styles.modalBidBerry : styles.modalBidClient}>
                        {clientName.toUpperCase()}
                      </span>
                    </>
                  )}
                  {time && (
                    <span className={styles.modalBidTime}> ({time})</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export function NounDetail({ nounId, onBack, onGoBack, onGoForward, canGoBack, canGoForward, onFilterByTrait }: NounDetailProps) {
  const { data: noun, isLoading, error } = useNounDetail(nounId);
  const { data: owner } = useNounOwner(nounId);
  const { auction } = useCurrentAuction();
  const [showBidsModal, setShowBidsModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleShare = useCallback(async () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${baseUrl}/probe/${nounId}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = fullUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setCopied(true);
    if (copyTimeout.current) clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopied(false), 2000);
  }, [nounId]);

  // The highest noun ID that exists (the current auction noun)
  const maxNounId = auction ? Number(auction.nounId) : null;

  // Check if this Noun is the one currently at auction
  const isCurrentAuction = auction && maxNounId === nounId && !auction.settled;

  // Fetch bids from Goldsky subgraph (only when viewing the current auction noun)
  const { data: auctionData } = useAuctionById(isCurrentAuction ? String(nounId) : null);
  const bids = auctionData?.auction?.bids ?? [];

  // Reset modal when navigating to a different noun
  useEffect(() => {
    setShowBidsModal(false);
  }, [nounId]);

  const handleOpenBids = useCallback(() => setShowBidsModal(true), []);
  const handleCloseBids = useCallback(() => setShowBidsModal(false), []);

  const traits = useMemo(() => {
    if (!noun) return null;
    return [
      { type: 'head' as TraitType, value: noun.head, name: getTraitName('head', noun.head) },
      { type: 'glasses' as TraitType, value: noun.glasses, name: getTraitName('glasses', noun.glasses) },
      { type: 'accessory' as TraitType, value: noun.accessory, name: getTraitName('accessory', noun.accessory) },
      { type: 'body' as TraitType, value: noun.body, name: getTraitName('body', noun.body) },
      { type: 'background' as TraitType, value: noun.background, name: getTraitName('background', noun.background) },
    ];
  }, [noun]);

  const bgColor = useMemo(() => {
    if (!noun) return undefined;
    const hex = ImageData.bgcolors[noun.background];
    return hex ? `#${hex}` : undefined;
  }, [noun]);

  const colors = useMemo(() => {
    if (!noun) return [];
    return getNounColors(noun);
  }, [noun]);

  // Loading / error states
  if (isLoading || error || !noun) {
    return (
      <div className={styles.container}>
        <div className={styles.topBar}>
          <div className={styles.breadcrumb}>
            <button className={styles.breadcrumbLink} onClick={onBack}>NOUNS</button>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>{nounId}</span>
          </div>
        </div>
        <div className={styles.loading}>
          {isLoading ? (
            <>
              <div className={styles.spinner} />
              <span>Loading Noun {nounId}...</span>
            </>
          ) : (
            <span>Noun {nounId} not found</span>
          )}
        </div>
      </div>
    );
  }

  const currentBidEth = isCurrentAuction
    ? `Ξ ${Number(formatEther(auction.amount)).toFixed(2)}`
    : null;

  return (
    <div className={styles.container} style={bgColor ? { background: bgColor } as React.CSSProperties : undefined}>
      {/* Top navigation bar */}
      <div className={styles.topBar}>
        <div className={styles.breadcrumb}>
          <button className={styles.breadcrumbLink} onClick={onBack}>NOUNS</button>
          <span className={styles.breadcrumbSep}>/</span>
          <span className={styles.breadcrumbCurrent}>{nounId}</span>
        </div>
        <div className={styles.navButtons}>
          <button
            className={styles.navButton}
            onClick={onGoBack}
            disabled={!canGoBack}
            title="Go back"
          >
            ←
          </button>
          <button
            className={styles.navButton}
            onClick={onGoForward}
            disabled={!canGoForward}
            title="Go forward"
          >
            →
          </button>
          <button
            className={styles.shareButton}
            onClick={handleShare}
            title={copied ? 'Copied!' : 'Copy link'}
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M11 2H5a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 5h4M6 8h4M6 11h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
            <span>{copied ? 'COPIED' : 'SHARE'}</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className={styles.content}>
        {/* Left: Info */}
        <div className={styles.infoSection}>
          <h1 className={styles.title}>NOUN {nounId}</h1>

          {/* Auction info (live) or settlement info (historical) */}
          <div className={styles.infoBlock}>
            {noun.settled_by_address && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>SETTLED BY: </span>
                <span className={styles.infoLink}>
                  {noun.settled_by_ens || truncateAddress(noun.settled_by_address)}
                </span>
                {noun.settled_at && (
                  <span className={styles.infoSecondary}>
                    {' '}{formatDateTime(noun.settled_at)}
                  </span>
                )}
              </div>
            )}

            {isCurrentAuction ? (
              <>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>AUCTION ENDS IN: </span>
                  <span className={styles.infoValue}>
                    <AuctionCountdown endTime={auction.endTime} />
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>CURRENT BID: </span>
                  <span className={styles.infoValue}>{currentBidEth}</span>
                  {auction.bidder && auction.bidder !== '0x0000000000000000000000000000000000000000' && (
                    <>
                      <span className={styles.infoSecondary}> BY </span>
                      <span className={styles.infoLink}>{truncateAddress(auction.bidder)}</span>
                    </>
                  )}
                </div>
                <div className={styles.infoRow}>
                  <button className={styles.seeAllBids} onClick={handleOpenBids}>
                    SEE ALL BIDS
                  </button>
                </div>
              </>
            ) : (
              <>
                {noun.winning_bid && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>WINNING BID: </span>
                    <span className={styles.infoValue}>{formatBidWei(noun.winning_bid)}</span>
                    {noun.winner_address && (
                      <>
                        <span className={styles.infoSecondary}> BY </span>
                        <span className={styles.infoLink}>
                          {noun.winner_ens || truncateAddress(noun.winner_address)}
                        </span>
                      </>
                    )}
                  </div>
                )}
                {owner && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>CURRENT OWNER: </span>
                    <span className={styles.infoLink}>{truncateAddress(owner)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bid input (only for current auction) */}
          {isCurrentAuction && (
            <BidSection nounId={nounId} currentBidWei={auction.amount} />
          )}

          {/* Color palette */}
          {colors.length > 0 && (
            <div className={styles.colorsSection}>
              <div className={styles.colorsTitle}>COLORS</div>
              <div className={styles.colorSwatches}>
                {colors.map((color, i) => (
                  <div
                    key={i}
                    className={styles.swatch}
                    style={{ background: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Traits */}
          {traits && (
            <div className={styles.traitsSection}>
              <div className={styles.traitsTitle}>ABOUT</div>
              {traits.map((trait) => (
                <div key={trait.type} className={styles.traitRow}>
                  <span className={styles.traitLabel}>{trait.type.toUpperCase()}:</span>
                  <button
                    className={styles.traitLink}
                    onClick={() => onFilterByTrait(trait.type, trait.value)}
                    title={`Filter by ${trait.type}: ${trait.name}`}
                  >
                    {trait.name.toUpperCase()}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Large Noun image */}
        <div className={styles.imageSection}>
          {noun.svg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/svg+xml,${encodeURIComponent(noun.svg)}`}
              alt={`Noun ${nounId}`}
              className={styles.nounImage}
            />
          ) : (
            <NounImage
              seed={{
                background: noun.background,
                body: noun.body,
                accessory: noun.accessory,
                head: noun.head,
                glasses: noun.glasses,
              }}
              size={480}
              className={styles.nounImage}
            />
          )}
        </div>
      </div>

      {/* Bids modal (centered in Probe window) */}
      {showBidsModal && (
        <BidsModal bids={bids} onClose={handleCloseBids} />
      )}
    </div>
  );
}
