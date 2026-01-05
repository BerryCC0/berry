/**
 * AddressInput Component
 * Input field that accepts both ENS names and Ethereum addresses
 * Automatically resolves ENS names to addresses
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEnsAddress, useEnsName } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { isAddress } from 'viem';
import styles from './AddressInput.module.css';

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  helpText?: string;
}

export function AddressInput({
  value,
  onChange,
  placeholder = '0x... or name.eth',
  disabled = false,
  helpText,
}: AddressInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isResolving, setIsResolving] = useState(false);
  
  // Check if input looks like an ENS name
  const isEnsName = inputValue && 
    !inputValue.startsWith('0x') && 
    (inputValue.includes('.') || inputValue.endsWith('.eth'));
  
  // Check if input is a valid address
  const isValidAddress = inputValue && isAddress(inputValue);
  
  // Resolve ENS name to address
  const { data: resolvedAddress, isLoading: isResolvingEns } = useEnsAddress({
    name: isEnsName ? inputValue : undefined,
    chainId: mainnet.id,
  });
  
  // Reverse resolve address to ENS name (for display)
  const { data: ensName } = useEnsName({
    address: isValidAddress ? inputValue as `0x${string}` : undefined,
    chainId: mainnet.id,
  });
  
  // Update resolving state
  useEffect(() => {
    setIsResolving(isResolvingEns);
  }, [isResolvingEns]);
  
  // When ENS resolves, update the parent with the resolved address
  useEffect(() => {
    if (isEnsName && resolvedAddress) {
      onChange(resolvedAddress);
    }
  }, [resolvedAddress, isEnsName, onChange]);
  
  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.trim();
    setInputValue(newValue);
    
    // If it's a valid address, update parent immediately
    if (isAddress(newValue)) {
      onChange(newValue);
    } else if (!newValue) {
      onChange('');
    }
    // If it's an ENS name, wait for resolution (handled by useEffect above)
  }, [onChange]);
  
  // Sync with external value changes
  useEffect(() => {
    if (value !== inputValue && isAddress(value)) {
      // External value is an address, keep our input as-is if it's an ENS name
      // that resolved to this address
      if (!isEnsName || resolvedAddress !== value) {
        setInputValue(value);
      }
    }
  }, [value, inputValue, isEnsName, resolvedAddress]);
  
  // Determine status indicator
  let statusIcon = null;
  let statusText = null;
  
  if (isResolving) {
    statusIcon = <span className={styles.statusResolving}>...</span>;
    statusText = 'Resolving ENS...';
  } else if (isEnsName && resolvedAddress) {
    statusIcon = <span className={styles.statusSuccess}>✓</span>;
    statusText = `${resolvedAddress.slice(0, 6)}...${resolvedAddress.slice(-4)}`;
  } else if (isEnsName && !isResolvingEns && inputValue.length > 3) {
    statusIcon = <span className={styles.statusError}>✗</span>;
    statusText = 'ENS name not found';
  } else if (isValidAddress && ensName) {
    statusIcon = <span className={styles.statusSuccess}>✓</span>;
    statusText = ensName;
  } else if (isValidAddress) {
    statusIcon = <span className={styles.statusSuccess}>✓</span>;
    statusText = 'Valid address';
  }
  
  return (
    <div className={styles.container}>
      <div className={styles.inputWrapper}>
        <input
          type="text"
          className={`${styles.input} ${isEnsName && !resolvedAddress && !isResolving && inputValue.length > 3 ? styles.inputError : ''}`}
          value={inputValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
        />
        {statusIcon && (
          <div className={styles.statusIcon}>
            {statusIcon}
          </div>
        )}
      </div>
      {statusText && (
        <div className={`${styles.statusText} ${isEnsName && !resolvedAddress && !isResolving ? styles.statusTextError : ''}`}>
          {statusText}
        </div>
      )}
      {helpText && !statusText && (
        <div className={styles.helpText}>{helpText}</div>
      )}
    </div>
  );
}
