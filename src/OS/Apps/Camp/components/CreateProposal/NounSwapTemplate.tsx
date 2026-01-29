/**
 * NounSwapTemplate Component
 * Multi-action form for swapping Nouns with treasury
 * Features: Auto-detect wallet, visual Noun selection, approval flow, optional tip
 */

'use client';

import React, { useEffect } from 'react';
import { useAccount } from 'wagmi';
import type { ActionTemplate, TemplateFieldValues } from '../../utils/actionTemplates';
import { TREASURY_ADDRESS } from '../../utils/actionTemplates';
import { useNounSelector } from '../../utils/hooks/useNounSelector';
import { useNounApproval } from '../../utils/hooks/useNounApproval';
import type { ValidationError } from '../../utils/types';
import { NounSelector } from './NounSelector';
import { AddressInput } from './AddressInput';
import styles from './NounSwapTemplate.module.css';

interface NounSwapTemplateProps {
  template: ActionTemplate;
  fieldValues: TemplateFieldValues;
  onUpdateField: (fieldName: string, value: string) => void;
  validationErrors: ValidationError[];
  disabled?: boolean;
}

export function NounSwapTemplate({
  template,
  fieldValues,
  onUpdateField,
  validationErrors,
  disabled = false,
}: NounSwapTemplateProps) {
  // Auto-detect connected wallet
  const { address, isConnected } = useAccount();

  // Fetch user's Nouns
  const userAddressToQuery = fieldValues.userAddress || address;
  const { 
    nouns: userNouns, 
    loading: userNounsLoading 
  } = useNounSelector(userAddressToQuery);

  // Fetch treasury Nouns
  const { 
    nouns: treasuryNouns, 
    loading: treasuryNounsLoading 
  } = useNounSelector(TREASURY_ADDRESS);

  // Check approval status for selected Noun
  const {
    isApproved,
    isApprovedForAll,
    needsApproval,
    isLoading: approvalLoading,
    approveNoun,
    approveAllNouns,
    isPending: approvePending,
    isConfirming: approveConfirming,
    isConfirmed: approveConfirmed,
    error: approvalError,
    refetch: refetchApproval,
  } = useNounApproval(fieldValues.userNounId);

  // Auto-fill user address when wallet connects
  useEffect(() => {
    if (isConnected && address && !fieldValues.userAddress) {
      onUpdateField('userAddress', address);
    }
  }, [isConnected, address, fieldValues.userAddress, onUpdateField]);

  // Refetch approval status after confirmation
  useEffect(() => {
    if (approveConfirmed) {
      refetchApproval();
    }
  }, [approveConfirmed, refetchApproval]);

  // Handle Noun selection
  const handleUserNounSelect = (nounId: string) => {
    onUpdateField('userNounId', nounId);
  };

  const handleTreasuryNounSelect = (nounId: string) => {
    onUpdateField('treasuryNounId', nounId);
  };

  // Tip currency options
  const tipCurrencyOptions = [
    { value: '', label: 'No Tip' },
    { value: 'eth', label: 'ETH' },
    { value: 'weth', label: 'WETH' },
    { value: 'usdc', label: 'USDC' },
  ];

  return (
    <div className={styles.container}>
      {/* User Address (auto-filled) */}
      <div className={styles.inputGroup}>
        <label className={styles.label}>
          Your Address
          <span className={styles.required}> *</span>
        </label>
        <AddressInput
          value={fieldValues.userAddress || ''}
          onChange={(value) => onUpdateField('userAddress', value)}
          placeholder="0x... or ENS name"
          disabled={disabled}
          helpText={isConnected ? 'Auto-detected from connected wallet' : 'Your wallet address (must own the Noun)'}
        />
        {validationErrors.find(err => err.field === 'userAddress') && (
          <div className={styles.error}>
            {validationErrors.find(err => err.field === 'userAddress')?.message}
          </div>
        )}
      </div>

      {/* User Noun Selector */}
      <NounSelector
        nouns={userNouns}
        selectedId={fieldValues.userNounId || null}
        onSelect={handleUserNounSelect}
        label="Your Noun *"
        loading={userNounsLoading}
        disabled={disabled}
        emptyMessage={userAddressToQuery ? 'This address owns no Nouns' : 'Enter your address to see Nouns'}
      />
      {validationErrors.find(err => err.field === 'userNounId') && (
        <div className={styles.error}>
          {validationErrors.find(err => err.field === 'userNounId')?.message}
        </div>
      )}

      {/* Treasury Noun Selector */}
      <NounSelector
        nouns={treasuryNouns}
        selectedId={fieldValues.treasuryNounId || null}
        onSelect={handleTreasuryNounSelect}
        label="Treasury Noun *"
        loading={treasuryNounsLoading}
        disabled={disabled}
        emptyMessage="Treasury holds no Nouns"
      />
      {validationErrors.find(err => err.field === 'treasuryNounId') && (
        <div className={styles.error}>
          {validationErrors.find(err => err.field === 'treasuryNounId')?.message}
        </div>
      )}

      {/* Approval Status & Actions */}
      {fieldValues.userNounId && fieldValues.userAddress && (
        <div className={styles.approvalSection}>
          <div className={styles.approvalHeader}>
            {needsApproval ? 'Approval Required' : 'Approval Status'}
          </div>
          
          {approvalLoading ? (
            <div className={styles.approvalStatus}>Checking approval status...</div>
          ) : needsApproval ? (
            <div className={styles.approvalWarning}>
              <div className={styles.warningText}>
                The Treasury must be approved to transfer your Noun before this proposal can execute.
                This is a one-time transaction.
              </div>
              
              <div className={styles.approvalButtons}>
                <button
                  type="button"
                  className={styles.approveButton}
                  onClick={approveNoun}
                  disabled={approvePending || approveConfirming || disabled}
                >
                  {approvePending || approveConfirming 
                    ? 'Approving...' 
                    : `Approve Noun ${fieldValues.userNounId}`}
                </button>
                
                <button
                  type="button"
                  className={styles.approveAllButton}
                  onClick={approveAllNouns}
                  disabled={approvePending || approveConfirming || disabled}
                >
                  {approvePending || approveConfirming 
                    ? 'Approving...' 
                    : 'Approve All Nouns'}
                </button>
              </div>
              
              <div className={styles.approvalHelpText}>
                &ldquo;Approve All&rdquo; grants the Treasury permission to transfer any of your Nouns in future swaps.
              </div>
              
              {approvalError && (
                <div className={styles.approvalError}>
                  Approval failed: {approvalError.message}
                </div>
              )}
              
              {approveConfirmed && (
                <div className={styles.approvalSuccess}>
                  Approval confirmed! You can now create the proposal.
                </div>
              )}
            </div>
          ) : (
            <div className={styles.approvalSuccess}>
              Treasury is approved to transfer {isApprovedForAll ? 'all your Nouns' : `Noun ${fieldValues.userNounId}`}
            </div>
          )}
        </div>
      )}

      {/* Tip Section */}
      <div className={styles.tipSection}>
        <div className={styles.tipHeader}>Optional Tip</div>
        <div className={styles.tipDescription}>
          Add a tip to sweeten the deal
        </div>

        <div className={styles.tipFields}>
          {/* Tip Currency */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Currency</label>
            <select
              className={styles.select}
              value={fieldValues.tipCurrency || ''}
              onChange={(e) => onUpdateField('tipCurrency', e.target.value)}
              disabled={disabled}
            >
              {tipCurrencyOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Tip Amount */}
          {fieldValues.tipCurrency && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Amount</label>
              <input
                type="text"
                className={styles.input}
                value={fieldValues.tipAmount || ''}
                onChange={(e) => onUpdateField('tipAmount', e.target.value)}
                placeholder="0.0"
                disabled={disabled}
              />
              <div className={styles.helpText}>
                Amount of {fieldValues.tipCurrency.toUpperCase()} to include
              </div>
              {validationErrors.find(err => err.field === 'tipAmount') && (
                <div className={styles.error}>
                  {validationErrors.find(err => err.field === 'tipAmount')?.message}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Swap Summary */}
      {fieldValues.userNounId && fieldValues.treasuryNounId && (
        <div className={styles.summarySection}>
          <div className={styles.summaryHeader}>Swap Summary</div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>You give:</span>
              <span className={styles.summaryValue}>Noun {fieldValues.userNounId}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>You receive:</span>
              <span className={styles.summaryValue}>Noun {fieldValues.treasuryNounId}</span>
            </div>
            {fieldValues.tipAmount && parseFloat(fieldValues.tipAmount) > 0 && (
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Tip:</span>
                <span className={styles.summaryValue}>
                  {fieldValues.tipAmount} {(fieldValues.tipCurrency || 'ETH').toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
