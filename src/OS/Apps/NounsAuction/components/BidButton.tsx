/**
 * BidButton Component
 * Place bids on the current auction with wallet integration
 */

'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
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
  const { address, isConnected } = useAccount();
  const { placeBid, isPending, isConfirming, isSuccess, error } = useBid();
  const [bidAmount, setBidAmount] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleBid = () => {
    if (!isConnected || !address) {
      setValidationError('Please connect your wallet');
      return;
    }

    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      setValidationError('Please enter a valid bid amount');
      return;
    }

    // Validate minimum bid
    if (parseFloat(bidAmount) < parseFloat(minBidETH)) {
      setValidationError(`Minimum bid is Ξ ${minBidETH}`);
      return;
    }

    setValidationError(null);
    
    try {
      placeBid(BigInt(nounId), bidAmount);
      setBidAmount('');
    } catch (err) {
      setValidationError('Invalid bid amount');
    }
  };

  if (!isConnected) {
    return (
      <div className={styles.bidButton}>
        <p className={styles.connectMessage}>
          Connect wallet to bid
        </p>
      </div>
    );
  }

  return (
    <div className={styles.bidButton}>
      <div className={styles.bidInputGroup}>
        <label htmlFor="bid-amount" className={styles.label}>
          Bid Amount (ETH)
        </label>
        <div className={styles.inputRow}>
          <input
            id="bid-amount"
            type="number"
            step="0.01"
            min="0"
            placeholder={`Min: ${minBidETH}`}
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
            {isPending ? 'Confirm...' : isConfirming ? 'Sending...' : 'Place Bid'}
          </button>
        </div>
      </div>

      {validationError && (
        <div className={styles.error}>{validationError}</div>
      )}

      {isSuccess && (
        <div className={styles.success}>Bid placed successfully!</div>
      )}

      {error && (
        <div className={styles.error}>
          {error.message || 'Transaction failed'}
        </div>
      )}
    </div>
  );
}

