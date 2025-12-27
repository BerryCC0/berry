/**
 * CandidateDetailView
 * Full candidate detail view with edit/cancel functionality for owners
 */

'use client';

import { useState } from 'react';
import { useAccount, useEnsName } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { useCandidate } from '../hooks/useCandidates';
import { useCandidateActions } from '../utils/hooks/useCandidateActions';
import { ShareButton } from '../components/ShareButton';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import styles from './CandidateDetailView.module.css';

interface CandidateDetailViewProps {
  proposer: string;
  slug: string;
  onNavigate: (path: string) => void;
  onBack: () => void;
}

export function CandidateDetailView({ proposer, slug, onNavigate, onBack }: CandidateDetailViewProps) {
  const { address, isConnected } = useAccount();
  const { data: candidate, isLoading, error, refetch } = useCandidate(proposer, slug);
  const { data: ensName } = useEnsName({
    address: proposer as `0x${string}`,
    chainId: mainnet.id,
  });
  
  const {
    cancelCandidate,
    isPending,
    isConfirming,
    isConfirmed,
    error: actionError,
  } = useCandidateActions();

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const proposerDisplay = ensName || `${proposer.slice(0, 6)}...${proposer.slice(-4)}`;
  
  // Check if connected user is the candidate owner
  const isOwner = isConnected && address?.toLowerCase() === proposer.toLowerCase();
  const isCanceled = candidate?.canceled === true;

  const handleEdit = () => {
    // Navigate to create view with edit mode
    onNavigate(`create/edit/${proposer}/${slug}`);
  };

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = async () => {
    setCancelError(null);
    try {
      await cancelCandidate(slug);
      setCancelSuccess(true);
      setShowCancelConfirm(false);
      // Refetch candidate data
      setTimeout(() => refetch(), 2000);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('user rejected')) {
          setCancelError('Transaction was rejected');
        } else {
          setCancelError(err.message);
        }
      } else {
        setCancelError('Failed to cancel candidate');
      }
    }
  };

  if (error) {
    return (
      <div className={styles.error}>
        <button className={styles.backButton} onClick={onBack}>Back</button>
        <p>Failed to load candidate</p>
      </div>
    );
  }

  if (isLoading || !candidate) {
    return (
      <div className={styles.loading}>
        <button className={styles.backButton} onClick={onBack}>Back</button>
        <p>Loading candidate...</p>
      </div>
    );
  }

  const title = candidate.title || candidate.slug.replace(/-/g, ' ');
  const createdDate = new Date(Number(candidate.createdTimestamp) * 1000);

  // Get status for display
  const getStatusBadge = () => {
    if (isCanceled) {
      return <span className={`${styles.statusBadge} ${styles.statusCanceled}`}>Canceled</span>;
    }
    // Could add more status checks here (promoted, etc.)
    return <span className={`${styles.statusBadge} ${styles.statusActive}`}>Active</span>;
  };

  return (
    <div className={styles.container}>
      <div className={styles.navBar}>
        <button className={styles.backButton} onClick={onBack}>Back</button>
        <ShareButton path={`candidate/${proposer}/${slug}`} />
      </div>

      <div className={styles.header}>
        <span className={styles.label}>Candidate</span>
        <span className={styles.slug}>/{candidate.slug}</span>
        {getStatusBadge()}
      </div>

      <h1 className={styles.title}>{title}</h1>

      {/* Success/Error Messages */}
      {cancelSuccess && (
        <div className={styles.successMessage}>
          Candidate has been canceled successfully.
        </div>
      )}
      {cancelError && (
        <div className={styles.errorMessage}>
          {cancelError}
        </div>
      )}

      {/* Owner Actions */}
      {isOwner && !isCanceled && (
        <div className={styles.ownerActions}>
          <span className={styles.ownerActionsLabel}>Owner</span>
          <button
            className={styles.editButton}
            onClick={handleEdit}
            disabled={isPending || isConfirming}
          >
            Edit Candidate
          </button>
          <button
            className={styles.cancelButton}
            onClick={handleCancelClick}
            disabled={isPending || isConfirming}
          >
            Cancel Candidate
          </button>
        </div>
      )}

      <div className={styles.meta}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Proposer</span>
          <span 
            className={styles.metaValue}
            onClick={() => onNavigate(`voter/${proposer}`)}
            style={{ cursor: 'pointer' }}
          >
            {proposerDisplay}
          </span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Created</span>
          <span className={styles.metaValue}>
            {createdDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className={styles.description}>
        <h2 className={styles.sectionTitle}>Description</h2>
        <MarkdownRenderer 
          content={candidate.description} 
          className={styles.descriptionContent}
        />
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <div className={styles.confirmDialog}>
          <div className={styles.confirmDialogContent}>
            <h3 className={styles.confirmDialogTitle}>Cancel Candidate?</h3>
            <p className={styles.confirmDialogMessage}>
              Are you sure you want to cancel this candidate? This action cannot be undone.
              Any collected signatures will be invalidated.
            </p>
            <div className={styles.confirmDialogButtons}>
              <button
                className={styles.confirmDialogCancel}
                onClick={() => setShowCancelConfirm(false)}
                disabled={isPending || isConfirming}
              >
                Keep Candidate
              </button>
              <button
                className={styles.confirmDialogConfirm}
                onClick={handleConfirmCancel}
                disabled={isPending || isConfirming}
              >
                {isPending ? 'Canceling...' : isConfirming ? 'Confirming...' : 'Cancel Candidate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

