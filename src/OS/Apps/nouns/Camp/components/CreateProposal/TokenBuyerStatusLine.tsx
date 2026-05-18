'use client';

/**
 * TokenBuyerStatusLine — read-only header chip for Token Buyer category forms.
 *
 * Surfaces three numbers in one row:
 *   - TokenBuyer ETH balance     (system fuel)
 *   - Payer USDC reserves        (immediately-payable balance)
 *   - Payer queued debt          (highlighted when > 0)
 *
 * Helps the proposer see at a glance whether a refill / repay is actually
 * worthwhile before building the action.
 */

import { formatEther, formatUnits } from 'viem';
import { useTokenBuyerStatus } from '../../hooks/useTokenBuyerStatus';
import styles from './TokenBuyerStatusLine.module.css';

function fmtEth(raw: bigint): string {
  const n = parseFloat(formatEther(raw));
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k Ξ`;
  return `${parseFloat(n.toFixed(3))} Ξ`;
}

function fmtUsdc(raw: bigint): string {
  const n = parseFloat(formatUnits(raw, 6));
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `$${(n / 1000).toFixed(0)}k`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export function TokenBuyerStatusLine() {
  const { tokenBuyerEth, payerUsdc, payerDebt, isLoading } = useTokenBuyerStatus();

  if (isLoading) {
    return <div className={styles.row}>Checking Token Buyer status…</div>;
  }

  const hasDebt = payerDebt !== undefined && payerDebt > BigInt(0);

  return (
    <div className={styles.row}>
      <span className={styles.cell}>
        <span className={styles.label}>TokenBuyer ETH</span>
        <span className={styles.value}>
          {tokenBuyerEth !== undefined ? fmtEth(tokenBuyerEth) : '—'}
        </span>
      </span>
      <span className={styles.sep} aria-hidden>·</span>
      <span className={styles.cell}>
        <span className={styles.label}>Payer USDC</span>
        <span className={styles.value}>
          {payerUsdc !== undefined ? fmtUsdc(payerUsdc) : '—'}
        </span>
      </span>
      <span className={styles.sep} aria-hidden>·</span>
      <span className={`${styles.cell} ${hasDebt ? styles.cellWarn : ''}`}>
        <span className={styles.label}>Queued debt</span>
        <span className={styles.value}>
          {payerDebt !== undefined ? fmtUsdc(payerDebt) : '—'}
        </span>
      </span>
    </div>
  );
}
