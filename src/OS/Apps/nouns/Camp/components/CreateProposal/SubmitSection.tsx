/**
 * SubmitSection
 * Submit button, cancel button, error/success messages
 */

import React from 'react';
import styles from './SubmitSection.module.css';

interface SubmitSectionProps {
  isEditingProposal: boolean;
  isEditingCandidate: boolean;
  proposalType: 'standard' | 'timelock_v1' | 'candidate';
  isCreating: boolean;
  hasVotingPower: boolean;
  isEditMode: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  errorMessage: string | null;
  proposalState: 'idle' | 'confirming' | 'pending' | 'error' | 'success';
  timelockV1State: 'idle' | 'confirming' | 'pending' | 'error' | 'success';
  candidateState: 'idle' | 'confirming' | 'pending' | 'error' | 'success';
  hasRecipientTemplate: boolean;
  kycVerified: boolean;
}

export function SubmitSection({
  isEditingProposal,
  isEditingCandidate,
  proposalType,
  isCreating,
  hasVotingPower,
  isEditMode,
  onSubmit,
  onCancel,
  errorMessage,
  proposalState,
  timelockV1State,
  candidateState,
  hasRecipientTemplate,
  kycVerified,
}: SubmitSectionProps) {
  const getButtonText = () => {
    if (isCreating) {
      return isEditMode ? 'Updating...' : 'Creating...';
    }
    if (isEditingProposal) {
      return 'Update Proposal';
    }
    if (isEditingCandidate) {
      return 'Update Candidate';
    }
    if (proposalType === 'candidate') {
      return 'Create Candidate';
    }
    if (proposalType === 'timelock_v1') {
      return 'Propose on TimelockV1';
    }
    return 'Create Proposal';
  };

  return (
    <>
      {/* Submit Buttons */}
      <div className={styles.submitSection}>
        <button
          className={styles.submitButton}
          onClick={onSubmit}
          disabled={isCreating || (!isEditMode && proposalType !== 'candidate' && !hasVotingPower)}
        >
          {getButtonText()}
        </button>
        {isEditMode && (
          <button
            className={styles.cancelButton}
            onClick={onCancel}
            disabled={isCreating}
          >
            Cancel
          </button>
        )}
      </div>

      {/* KYC Warning for proposals (not candidates) with recipient templates */}
      {proposalType !== 'candidate' && hasRecipientTemplate && !kycVerified && (
        <div className={styles.warning}>
          <strong>KYC Not Completed:</strong> You can still submit this proposal, but if it succeeds and you haven&apos;t completed KYC, it may not be executed.
        </div>
      )}

      {/* Error/Success Messages */}
      {errorMessage && (
        <div className={errorMessage.includes('successfully') ? styles.success : styles.error}>
          {errorMessage}
        </div>
      )}

      {proposalState === 'success' && (
        <div className={styles.success}>
          Your proposal has been successfully created! It will appear in the proposals list once confirmed on-chain.
        </div>
      )}

      {timelockV1State === 'success' && (
        <div className={styles.success}>
          Your TimelockV1 proposal has been successfully created! It will appear in the proposals list once confirmed on-chain.
        </div>
      )}

      {candidateState === 'success' && (
        <div className={styles.success}>
          Your candidate has been successfully created! Share it with the community to gather support.
        </div>
      )}
    </>
  );
}
