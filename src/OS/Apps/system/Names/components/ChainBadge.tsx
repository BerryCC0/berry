"use client";

/**
 * Small label identifying which chain an address record is for.
 * Used in the Addresses RecordSection.
 */

import styles from "./ChainBadge.module.css";

const CHAIN_LABELS: Record<number, string> = {
  60: "Ethereum",
  0: "Bitcoin",
  2: "Litecoin",
  3: "Dogecoin",
  501: "Solana",
  2147483658: "Optimism",
  2147525809: "Arbitrum",
  2147483785: "Polygon",
  2147492101: "Base",
};

interface ChainBadgeProps {
  /** SLIP-44 / ENSIP-11 coin type. */
  coinType: number;
}

export function ChainBadge({ coinType }: ChainBadgeProps) {
  const label = CHAIN_LABELS[coinType] ?? `coin ${coinType}`;
  return <span className={styles.badge}>{label}</span>;
}
