'use client';

/**
 * Two small read-only indicators driven off the Payer contract's live USDC
 * balance:
 *
 *   <PayerReservesLine />     — header line shown above the form, always.
 *   <PayerShortfallWarning /> — shown under the amount field only when the
 *                                requested amount exceeds reserves.
 *
 * Split into two pieces so each can be positioned independently in the
 * template's render path.
 */

import { formatUnits, parseUnits } from 'viem';
import { usePayerUsdcBalance } from '../../hooks/usePayerUsdcBalance';
import styles from './PayerBalanceHint.module.css';

function fmtUsdc(raw: bigint): string {
  const n = parseFloat(formatUnits(raw, 6));
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Standalone reserves indicator, used as a header above the payment-once form.
 */
export function PayerReservesLine() {
  const { balance, isLoading, error } = usePayerUsdcBalance();

  if (isLoading) {
    return (
      <div className={styles.reservesPill}>
        <span className={styles.reservesLabel}>Payer reserves</span>
        <span className={styles.reservesValue}>checking…</span>
      </div>
    );
  }
  if (error || balance === undefined) return null;

  return (
    <div className={styles.reservesPill}>
      <span className={styles.reservesLabel}>Payer reserves</span>
      <span className={styles.reservesValue}>${fmtUsdc(balance)} USDC</span>
    </div>
  );
}

interface PayerShortfallWarningProps {
  /** Current value of the amount field (USDC display units, e.g. "1000.50"). */
  amount: string;
}

/**
 * Conditional warning: only renders when the requested amount exceeds the
 * Payer's current reserves. Calls out the exact shortfall amount.
 */
export function PayerShortfallWarning({ amount }: PayerShortfallWarningProps) {
  const { balance, error } = usePayerUsdcBalance();

  if (error || balance === undefined) return null;

  let requested: bigint;
  try {
    requested = amount ? parseUnits(amount, 6) : BigInt(0);
  } catch {
    requested = BigInt(0);
  }

  if (requested <= balance || requested === BigInt(0)) return null;

  const shortfallStr = fmtUsdc(requested - balance);
  return (
    <div className={styles.shortfallPill}>
      <span className={styles.shortfallIcon} aria-hidden>⚠</span>
      <span className={styles.shortfallAmount}>${shortfallStr}</span>
      <span className={styles.shortfallSep}>over reserves</span>
      <span className={styles.shortfallNote}>· queued as debt until Payer is refilled</span>
    </div>
  );
}
