/**
 * DelegateModal Component
 * Modal for changing Nouns voting delegation
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEnsAddress } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { isAddress } from 'viem';
import { Dialog } from '@/OS/Primitives';
import { useEnsName } from '@/OS/hooks/useEnsData';
import { formatAddress as formatAddressUtil, truncateAddress } from '@/shared/format';
import { useDelegate } from '@/app/lib/nouns/hooks';
import styles from './DelegateModal.module.css';

interface DelegateModalProps {
  userAddress: `0x${string}`;
  onClose: () => void;
}

export function DelegateModal({ userAddress, onClose }: DelegateModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState<`0x${string}` | null>(null);

  const {
    currentDelegate,
    isLoadingDelegate,
    delegate,
    delegateToSelf,
    isPending,
    isConfirming,
    isSuccess,
    error,
    refetch,
  } = useDelegate(userAddress);

  // Get ENS name for current delegate
  const currentDelegateEns = useEnsName(currentDelegate || undefined);

  // Check if input is an ENS name
  const isEnsName = inputValue &&
    !inputValue.startsWith('0x') &&
    (inputValue.includes('.') || inputValue.endsWith('.eth'));

  // Resolve ENS name to address
  const { data: ensResolvedAddress, isLoading: isResolvingEns } = useEnsAddress({
    name: isEnsName ? inputValue : undefined,
    chainId: mainnet.id,
  });

  // Check if input is a valid address
  const isValidAddress = inputValue && isAddress(inputValue);

  // Update resolved address when ENS resolves or direct address entered
  useEffect(() => {
    if (isEnsName && ensResolvedAddress) {
      setResolvedAddress(ensResolvedAddress);
    } else if (isValidAddress) {
      setResolvedAddress(inputValue as `0x${string}`);
    } else {
      setResolvedAddress(null);
    }
  }, [ensResolvedAddress, isEnsName, isValidAddress, inputValue]);

  // Handle successful delegation
  useEffect(() => {
    if (isSuccess) {
      refetch();
      // Close after a short delay to show success
      const timer = setTimeout(() => {
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, refetch, onClose]);

  const handleDelegate = useCallback(() => {
    if (resolvedAddress) {
      delegate(resolvedAddress);
    }
  }, [resolvedAddress, delegate]);

  const handleDelegateToSelf = useCallback(() => {
    delegateToSelf();
  }, [delegateToSelf]);

  const isSelfDelegated = currentDelegate?.toLowerCase() === userAddress.toLowerCase();
  const isLoading = isPending || isConfirming;
  const canDelegate = !!resolvedAddress && !isLoading;

  const delegateLabel = isPending
    ? 'Confirm in Wallet...'
    : isConfirming
      ? 'Confirming...'
      : 'Delegate';

  return (
    <Dialog
      open
      onClose={onClose}
      title="Change Delegation"
      width={400}
      closeOnBackdropClick={!isLoading}
      closeOnEscape={!isLoading}
      actions={
        isSelfDelegated
          ? [
              {
                label: delegateLabel,
                variant: 'primary',
                onClick: handleDelegate,
                closeOnClick: false,
              },
            ]
          : [
              {
                label: 'Delegate to Self',
                variant: 'default',
                onClick: handleDelegateToSelf,
                closeOnClick: false,
              },
              {
                label: delegateLabel,
                variant: 'primary',
                onClick: handleDelegate,
                closeOnClick: false,
              },
            ]
      }
    >
      <div className={styles.content}>
        {/* Current delegate */}
        <div className={styles.currentDelegate}>
          <span className={styles.label}>Currently delegated to:</span>
          {isLoadingDelegate ? (
            <img src="/icons/loader.gif" alt="" className={styles.loadingGif} />
          ) : currentDelegate ? (
            <span className={styles.delegateAddress}>
              {isSelfDelegated ? 'Yourself' : formatAddressUtil(currentDelegate, currentDelegateEns)}
            </span>
          ) : (
            <span className={styles.noDelegation}>Not delegated</span>
          )}
        </div>

        {/* New delegate input */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>New delegate:</label>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              className={styles.input}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.trim())}
              placeholder="0x... or name.eth"
              disabled={isLoading}
            />
            {isResolvingEns && (
              <span className={styles.resolving}>...</span>
            )}
            {resolvedAddress && (
              <span className={styles.resolved}>✓</span>
            )}
            {isEnsName && !isResolvingEns && !ensResolvedAddress && inputValue.length > 3 && (
              <span className={styles.notFound}>✗</span>
            )}
          </div>
          {resolvedAddress && isEnsName && (
            <span className={styles.resolvedAddress}>
              {truncateAddress(resolvedAddress)}
            </span>
          )}
        </div>

        {!canDelegate && resolvedAddress === null && inputValue.length === 0 && (
          <p className={styles.hint}>Enter an address or ENS name to delegate.</p>
        )}

        {/* Status messages */}
        {isSuccess && (
          <div className={styles.success}>
            Delegation updated successfully!
          </div>
        )}

        {error && (
          <div className={styles.error}>
            {error.message?.includes('User rejected')
              ? 'Transaction rejected'
              : 'Transaction failed'}
          </div>
        )}
      </div>
    </Dialog>
  );
}
