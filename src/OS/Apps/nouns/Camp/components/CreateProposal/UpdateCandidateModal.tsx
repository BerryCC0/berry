/**
 * UpdateCandidateModal
 * Modal for entering an update reason when editing a candidate
 */

import React from 'react';
import styles from './UpdateCandidateModal.module.css';

interface UpdateCandidateModalProps {
  isOpen: boolean;
  updateReason: string;
  onUpdateReason: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  hasVotingPower: boolean;
  updateCandidateCost: bigint | undefined;
  state: 'idle' | 'pending' | 'success' | 'error';
  errorMessage: string | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function UpdateCandidateModal({
  isOpen,
  updateReason,
  onUpdateReason,
  onClose,
  onConfirm,
  hasVotingPower,
  updateCandidateCost,
  state,
  errorMessage,
  textareaRef,
}: UpdateCandidateModalProps) {
  if (!isOpen) return null;

  const handleBackgroundClick = () => {
    if (state !== 'pending') {
      onClose();
    }
  };

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  return (
    <div className={styles.modalOverlay} onClick={handleBackgroundClick}>
      <div className={styles.modalContent} onClick={handleContentClick}>
        <h3 className={styles.modalTitle}>Update Candidate</h3>

        {state === 'success' ? (
          <div className={styles.modalSuccess}>
            Your candidate has been successfully updated! Redirecting...
          </div>
        ) : (
          <>
            <p className={styles.modalDescription}>
              Provide an optional reason for this update. This will be recorded on-chain.
            </p>

            <textarea
              ref={textareaRef}
              className={styles.modalTextarea}
              value={updateReason}
              onChange={(e) => onUpdateReason(e.target.value)}
              placeholder="Briefly describe what changed (optional)"
              disabled={state === 'pending'}
              rows={3}
            />

            {!hasVotingPower && updateCandidateCost && (
              <div className={styles.modalFeeNotice}>
                Update fee: {(Number(updateCandidateCost) / 1e18).toFixed(4)} ETH
                <span className={styles.modalFeeNote}>(waived for Noun owners)</span>
              </div>
            )}

            {state === 'error' && errorMessage && (
              <div className={styles.modalError}>{errorMessage}</div>
            )}

            <div className={styles.modalActions}>
              <button
                className={styles.modalButtonSecondary}
                onClick={onClose}
                disabled={state === 'pending'}
              >
                Cancel
              </button>
              <button
                className={styles.modalButtonPrimary}
                onClick={onConfirm}
                disabled={state === 'pending'}
              >
                {state === 'pending' ? 'Updating...' : 'Update Candidate'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
