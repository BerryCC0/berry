/**
 * Compact transaction status banner — pending → confirming → success/error.
 */

'use client';

import { v2TxLink } from '../contracts';
import styles from './V2TxStatusBanner.module.css';

interface Props {
  hash?: `0x${string}` | null;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
  onDismiss?: () => void;
  successMessage?: string;
}

export function V2TxStatusBanner({
  hash,
  isPending,
  isConfirming,
  isSuccess,
  error,
  onDismiss,
  successMessage = 'Transaction confirmed.',
}: Props) {
  if (!isPending && !isConfirming && !isSuccess && !error) return null;

  const tone = error ? 'error' : isSuccess ? 'success' : 'info';
  const label = error
    ? error.message.split('\n')[0].slice(0, 200)
    : isSuccess
      ? successMessage
      : isConfirming
        ? 'Waiting for confirmation…'
        : 'Confirm in your wallet…';

  return (
    <div className={`${styles.banner} ${styles[tone]}`}>
      <span className={styles.label}>{label}</span>
      {hash && (
        <a className={styles.link} href={v2TxLink(hash)} target="_blank" rel="noopener noreferrer">
          View tx ↗
        </a>
      )}
      {onDismiss && (isSuccess || error) && (
        <button type="button" className={styles.dismiss} onClick={onDismiss}>
          Dismiss
        </button>
      )}
    </div>
  );
}
