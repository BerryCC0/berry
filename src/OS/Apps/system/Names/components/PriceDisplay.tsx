"use client";

/**
 * Render an ETH price + its USD equivalent. Uses Berry's existing
 * useEthPrice for the USD rate.
 */

import { useEthPrice } from "@/app/lib/nouns/hooks";
import styles from "./PriceDisplay.module.css";

interface PriceDisplayProps {
  /** Price in wei. */
  wei: bigint | undefined;
  size?: "sm" | "md" | "lg";
}

function formatEth(wei: bigint, decimals = 4): string {
  const whole = wei / BigInt(1e18);
  const fractional = wei % BigInt(1e18);
  const fracStr = fractional.toString().padStart(18, "0").slice(0, decimals);
  return `${whole}.${fracStr}`;
}

export function PriceDisplay({ wei, size = "md" }: PriceDisplayProps) {
  const { price: ethUsd } = useEthPrice();

  if (wei === undefined) return <span className={`${styles.price} ${styles[size]}`}>—</span>;

  const eth = formatEth(wei);
  const ethNum = Number(eth);
  const usd = ethNum * ethUsd;

  return (
    <span className={`${styles.price} ${styles[size]}`}>
      <span className={styles.eth}>{eth} ETH</span>
      {ethUsd > 0 && <span className={styles.usd}>~${usd.toFixed(2)}</span>}
    </span>
  );
}
