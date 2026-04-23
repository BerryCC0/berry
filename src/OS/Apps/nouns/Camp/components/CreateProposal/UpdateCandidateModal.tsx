/**
 * UpdateCandidateModal
 * Modal for entering an update reason when editing a candidate
 */

import React, { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { NOUNS_CONTRACTS } from '@/app/lib/nouns/contracts';
import type { Candidate } from '../../types';
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
  /**
   * The candidate being edited. When present, the modal shows a warning
   * listing how many active sponsor signatures (and how many nouns' worth
   * of voting power) will be invalidated by the edit.
   */
  candidate?: Candidate;
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
  candidate,
}: UpdateCandidateModalProps) {
  // Determine which sigs are currently active (non-expired) AND will be
  // invalidated by this edit. We consider a sig "to be invalidated" iff it
  // matches the candidate's CURRENT `encodedProposalHash` — i.e. it's valid
  // right now and the upcoming `updateProposalCandidate` call will move the
  // hash forward, killing it. Already-stale sigs are not our concern: they
  // were invalidated by a prior edit.
  const sigsToInvalidate = useMemo(() => {
    if (!candidate?.signatures) return [];
    const now = Math.floor(Date.now() / 1000);
    const currentHash = candidate.encodedProposalHash?.toLowerCase() || '';
    return candidate.signatures.filter(sig => {
      if (Number(sig.expirationTimestamp) <= now) return false;
      // If we don't know the current hash (e.g. older cached data), be
      // conservative and assume every non-expired sig is active.
      if (!currentHash) return true;
      if (!sig.encodedPropHash) return true;
      return sig.encodedPropHash.toLowerCase() === currentHash;
    });
  }, [candidate]);

  // Unique signers of the sigs-to-invalidate set — we only want to count
  // each signer's voting power once.
  const uniqueSigners = useMemo(() => {
    const seen = new Set<string>();
    const out: `0x${string}`[] = [];
    for (const sig of sigsToInvalidate) {
      const key = sig.signer.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(sig.signer as `0x${string}`);
    }
    return out;
  }, [sigsToInvalidate]);

  // Batch-read current voting power for each unique signer.
  const { data: votingPowerData } = useReadContracts({
    contracts: uniqueSigners.map(signer => ({
      address: NOUNS_CONTRACTS.token.address,
      abi: NOUNS_CONTRACTS.token.abi,
      functionName: 'getCurrentVotes' as const,
      args: [signer] as const,
    })),
    query: {
      enabled: uniqueSigners.length > 0,
    },
  });

  const nounsToInvalidate = useMemo(() => {
    if (!votingPowerData) return 0;
    return votingPowerData.reduce((sum, result) => {
      if (result.status === 'success' && typeof result.result === 'bigint') {
        return sum + Number(result.result);
      }
      return sum;
    }, 0);
  }, [votingPowerData]);

  const sigCount = sigsToInvalidate.length;
  const showInvalidationWarning = sigCount > 0 && state !== 'success';

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

            {showInvalidationWarning && (
              <div className={styles.invalidationWarning}>
                <strong className={styles.invalidationWarningTitle}>
                  ⚠ This edit will invalidate active sponsor signatures
                </strong>
                <p className={styles.invalidationWarningBody}>
                  {sigCount} active sponsor signature{sigCount !== 1 ? 's' : ''}
                  {nounsToInvalidate > 0 && (
                    <> ({nounsToInvalidate} noun{nounsToInvalidate !== 1 ? 's' : ''})</>
                  )}{' '}
                  will stop counting toward the promotion threshold as soon as this
                  update lands on-chain. Sponsors will need to re-sign to be counted
                  again.
                </p>
              </div>
            )}

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
