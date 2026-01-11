/**
 * BidButton Component
 * Place bids on the current auction with wallet integration
 */

'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useTranslation } from '@/OS/lib/i18n';
import { useBid } from '@/app/lib/nouns/hooks';
import styles from './BidButton.module.css';

interface BidButtonProps {
  nounId: string;
  currentBidETH: string;
  minBidETH: string;
  disabled?: boolean;
}

export function BidButton({ 
  nounId, 
  currentBidETH, 
  minBidETH,
  disabled = false 
}: BidButtonProps) {
  const { t } = useTranslation();
  const { address, isConnected } = useAccount();
  const { placeBid, isPending, isConfirming, isSuccess, error } = useBid();
  const [bidAmount, setBidAmount] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleBid = () => {
    if (!isConnected || !address) {
      setValidationError(t('wallet.connectWallet'));
      return;
    }

    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      setValidationError(t('errors.invalidInput'));
      return;
    }

    // Validate minimum bid
    if (parseFloat(bidAmount) < parseFloat(minBidETH)) {
      setValidationError(`${t('auction.minBid')}: Ξ ${minBidETH}`);
      return;
    }

    setValidationError(null);
    
    try {
      placeBid(BigInt(nounId), bidAmount);
      setBidAmount('');
    } catch (err) {
      setValidationError(t('errors.invalidInput'));
    }
  };

  if (!isConnected) {
    return (
      <div className={styles.bidButton}>
        <p className={styles.connectMessage}>
          {t('wallet.connectWallet')}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.bidButton}>
      <div className={styles.bidInputGroup}>
        <label htmlFor="bid-amount" className={styles.label}>
          {t('auction.bidAmount')}
        </label>
        <div className={styles.inputRow}>
          <input
            id="bid-amount"
            type="number"
            step="0.01"
            min="0"
            placeholder={`${t('auction.minBid')}: ${minBidETH}`}
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            disabled={isPending || isConfirming || disabled}
            className={styles.input}
          />
          <button
            onClick={handleBid}
            disabled={isPending || isConfirming || disabled || !bidAmount}
            className={styles.button}
          >
            {isPending || isConfirming ? t('common.loading') : t('auction.placeBid')}
          </button>
        </div>
      </div>

      {validationError && (
        <div className={styles.error}>{validationError}</div>
      )}

      {isSuccess && (
        <div className={styles.success}>{t('auction.bidPlaced', { address: '' })}</div>
      )}

      {error && (
        <div className={styles.error}>
          {error.message || t('errors.transactionFailed')}
        </div>
      )}
    </div>
  );
}

