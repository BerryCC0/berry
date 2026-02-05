"use client";

/**
 * Crystal Ball App
 * Shows what the next Noun would look like if minted at the current block
 */

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import type { AppComponentProps } from "@/OS/types/app";
import { NounImage } from "@/app/lib/nouns/components";
import { getTraitName } from "@/app/lib/nouns/utils/trait-name-utils";
import { useBid } from "@/app/lib/nouns/hooks";
import { useCrystalBall } from "./hooks/useCrystalBall";
import styles from "./CrystalBall.module.css";

/**
 * Format seconds into HH:MM:SS
 */
function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "00:00:00";
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return [hours, minutes, secs]
    .map(v => v.toString().padStart(2, "0"))
    .join(":");
}

export function CrystalBall({}: AppComponentProps) {
  const { seed, nextNounId, blockNumber, isLoading, canSettle, auctionEndTime, refetchAuction } = useCrystalBall();
  const { isConnected } = useAccount();
  const { settleAuction, isPending, isConfirming, isSuccess, error } = useBid();
  
  // Countdown timer state
  const [countdown, setCountdown] = useState<string>("00:00:00");

  // Update countdown every second
  useEffect(() => {
    if (!auctionEndTime || canSettle) {
      setCountdown("00:00:00");
      return;
    }

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, auctionEndTime - now);
      setCountdown(formatCountdown(remaining));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [auctionEndTime, canSettle]);

  const handleSettle = () => {
    settleAuction();
  };

  // Refetch auction data after successful settle
  if (isSuccess) {
    refetchAuction();
  }

  return (
    <div className={styles.container}>
      {/* Noun Preview */}
      <div className={styles.imageSection}>
        {isLoading ? (
          <div className={styles.placeholder}>
            <span className={styles.crystal}>🔮</span>
          </div>
        ) : seed ? (
          <NounImage seed={seed} size={280} className={styles.nounImage} />
        ) : (
          <div className={styles.placeholder}>
            <span className={styles.crystal}>🔮</span>
          </div>
        )}
      </div>

      {/* Block Info */}
      <div className={styles.blockInfo}>
        <span className={styles.label}>Current Block</span>
        <span className={styles.value}>
          {isLoading ? "..." : blockNumber?.toString() || "—"}
        </span>
      </div>

      {/* Noun ID */}
      <div className={styles.blockInfo}>
        <span className={styles.label}>Next Noun</span>
        <span className={styles.value}>
          {isLoading ? "..." : nextNounId ? `Noun ${nextNounId}` : "—"}
        </span>
      </div>

      {/* Traits List */}
      <div className={styles.traitsList}>
        <div className={styles.traitItem}>
          <span className={styles.traitLabel}>Head</span>
          <span className={styles.traitValue}>
            {isLoading ? "..." : seed ? getTraitName("head", seed.head) : "—"}
          </span>
        </div>
        <div className={styles.traitItem}>
          <span className={styles.traitLabel}>Glasses</span>
          <span className={styles.traitValue}>
            {isLoading ? "..." : seed ? getTraitName("glasses", seed.glasses) : "—"}
          </span>
        </div>
        <div className={styles.traitItem}>
          <span className={styles.traitLabel}>Body</span>
          <span className={styles.traitValue}>
            {isLoading ? "..." : seed ? getTraitName("body", seed.body) : "—"}
          </span>
        </div>
        <div className={styles.traitItem}>
          <span className={styles.traitLabel}>Accessory</span>
          <span className={styles.traitValue}>
            {isLoading ? "..." : seed ? getTraitName("accessory", seed.accessory) : "—"}
          </span>
        </div>
        <div className={styles.traitItem}>
          <span className={styles.traitLabel}>Background</span>
          <span className={styles.traitValue}>
            {isLoading ? "..." : seed ? getTraitName("background", seed.background) : "—"}
          </span>
        </div>
      </div>

      {/* Settle Button */}
      <div className={styles.settleSection}>
        {!isConnected ? (
          <p className={styles.connectMessage}>Connect wallet to settle</p>
        ) : canSettle ? (
          <>
            <button
              className={styles.settleButton}
              onClick={handleSettle}
              disabled={isPending || isConfirming}
            >
              {isPending || isConfirming ? "Settling..." : "Settle Auction"}
            </button>
            {error && (
              <p className={styles.error}>{error.message || "Transaction failed"}</p>
            )}
            {isSuccess && (
              <p className={styles.success}>Auction settled!</p>
            )}
          </>
        ) : (
          <div className={styles.countdown}>
            <span className={styles.countdownTime}>{countdown}</span>
            <span className={styles.countdownLabel}>until Noun O&apos; Clock</span>
          </div>
        )}
      </div>
    </div>
  );
}
