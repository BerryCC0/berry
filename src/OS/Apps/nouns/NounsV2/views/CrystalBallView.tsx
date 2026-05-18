/**
 * Crystal Ball — predicts the next NounV2 each mainnet block and exposes a
 * settle button when the current V2 auction has ended.
 *
 * Mirrors the V1 CrystalBall UX (image, block info, traits, countdown/settle)
 * but uses V2 contracts and the V2 seeder rule, including the rare slobber
 * override applied off-chain inside getV2NounSeedFromBlockHash.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { V2NounImageFromSeed } from '../components/V2NounImageFromSeed';
import { useV2CrystalBall } from '../hooks/useV2CrystalBall';
import { useV2Bid } from '../hooks/useV2Bid';
import { isSlobber, isSlobberEligible } from '../utils/slobber';
import { getV2SeedLabels } from '../utils/traitLabels';
import styles from './CrystalBallView.module.css';

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':');
}

export function CrystalBallView() {
  const {
    seed,
    nextNounId,
    blockNumber,
    isLoading,
    canSettle,
    auctionEndTime,
    refetchAuction,
  } = useV2CrystalBall();

  const { isConnected } = useAccount();
  const { settle, isPending, isConfirming, isSuccess, error } = useV2Bid();

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (!auctionEndTime || canSettle) return;
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, [auctionEndTime, canSettle]);

  const countdown = useMemo(() => {
    if (!auctionEndTime || canSettle) return '00:00:00';
    return formatCountdown(Math.max(0, auctionEndTime - now));
  }, [auctionEndTime, canSettle, now]);

  useEffect(() => {
    if (isSuccess) refetchAuction();
  }, [isSuccess, refetchAuction]);

  const labels = seed ? getV2SeedLabels(seed) : null;
  const slobber = seed ? isSlobber(seed) : false;
  const slobberNear = seed ? !slobber && isSlobberEligible(seed) : false;

  return (
    <div className={styles.container}>
      <div className={styles.imageSection}>
        {isLoading || !seed ? (
          <div className={styles.placeholder}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/crystal-ball.png" alt="Crystal Ball" className={styles.crystalIcon} />
          </div>
        ) : (
          <V2NounImageFromSeed seed={seed} size={280} className={styles.nounImage} />
        )}
      </div>

      {slobber && (
        <div className={styles.slobberBanner}>
          Slobber prediction — ~1 in 36,179 mints
        </div>
      )}
      {slobberNear && (
        <div className={styles.slobberHint}>
          Slobber-eligible base seed (50/50 coin flip lost)
        </div>
      )}

      <div className={styles.blockInfo}>
        <span className={styles.label}>Current Block</span>
        <span className={styles.value}>
          {isLoading ? '...' : blockNumber?.toString() ?? '—'}
        </span>
      </div>

      <div className={styles.blockInfo}>
        <span className={styles.label}>Next Noun</span>
        <span className={styles.value}>
          {isLoading ? '...' : nextNounId != null ? `Noun ${nextNounId}` : '—'}
        </span>
      </div>

      <div className={styles.traitsList}>
        <div className={styles.traitItem}>
          <span className={styles.traitLabel}>Head</span>
          <span className={styles.traitValue}>{labels?.head ?? '—'}</span>
        </div>
        <div className={styles.traitItem}>
          <span className={styles.traitLabel}>Glasses</span>
          <span className={styles.traitValue}>{labels?.glasses ?? '—'}</span>
        </div>
        <div className={styles.traitItem}>
          <span className={styles.traitLabel}>Body</span>
          <span className={styles.traitValue}>{labels?.body ?? '—'}</span>
        </div>
        <div className={styles.traitItem}>
          <span className={styles.traitLabel}>Accessory</span>
          <span className={styles.traitValue}>{labels?.accessory ?? '—'}</span>
        </div>
        <div className={styles.traitItem}>
          <span className={styles.traitLabel}>Background</span>
          <span className={styles.traitValue}>{labels?.background ?? '—'}</span>
        </div>
      </div>

      <div className={styles.settleSection}>
        {canSettle ? (
          isConnected ? (
            <>
              <button
                type="button"
                className={styles.settleButton}
                onClick={() => settle()}
                disabled={isPending || isConfirming}
              >
                {isPending || isConfirming ? 'Settling…' : 'Settle Auction'}
              </button>
              {error && <p className={styles.error}>{error.message || 'Transaction failed'}</p>}
              {isSuccess && <p className={styles.success}>Auction settled!</p>}
            </>
          ) : (
            <p className={styles.connectMessage}>Connect wallet to settle</p>
          )
        ) : (
          <div className={styles.countdown}>
            <span className={styles.countdownTime}>{countdown}</span>
            <span className={styles.countdownLabel}>until Noun O&apos;Clock</span>
          </div>
        )}
      </div>
    </div>
  );
}
