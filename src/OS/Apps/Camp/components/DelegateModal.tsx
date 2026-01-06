/**
 * DelegateModal Component
 * Modal for changing Nouns voting delegation
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEnsAddress, useEnsName } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { isAddress } from 'viem';
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
  const { data: currentDelegateEns } = useEnsName({
    address: currentDelegate,
    chainId: mainnet.id,
  });
  
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
  
  const formatAddress = (address: string, ensName?: string | null) => 
    ensName || `${address.slice(0, 6)}...${address.slice(-4)}`;
  
  const isSelfDelegated = currentDelegate?.toLowerCase() === userAddress.toLowerCase();
  const isLoading = isPending || isConfirming;
  const canDelegate = resolvedAddress && !isLoading;
  
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Change Delegation</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.content}>
          {/* Current delegate */}
          <div className={styles.currentDelegate}>
            <span className={styles.label}>Currently delegated to:</span>
            {isLoadingDelegate ? (
              <span className={styles.loading}>Loading...</span>
            ) : currentDelegate ? (
              <span className={styles.delegateAddress}>
                {isSelfDelegated ? 'Yourself' : formatAddress(currentDelegate, currentDelegateEns)}
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
                {resolvedAddress.slice(0, 6)}...{resolvedAddress.slice(-4)}
              </span>
            )}
          </div>
          
          {/* Action buttons */}
          <div className={styles.actions}>
            <button
              className={styles.delegateButton}
              onClick={handleDelegate}
              disabled={!canDelegate}
            >
              {isPending ? 'Confirm in Wallet...' : 
               isConfirming ? 'Confirming...' : 
               'Delegate'}
            </button>
            
            {!isSelfDelegated && (
              <button
                className={styles.selfDelegateButton}
                onClick={handleDelegateToSelf}
                disabled={isLoading}
              >
                Delegate to Self
              </button>
            )}
          </div>
          
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
      </div>
    </div>
  );
}
