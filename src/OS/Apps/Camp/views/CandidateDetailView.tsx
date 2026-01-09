/**
 * CandidateDetailView
 * Full candidate detail view with edit/cancel/promote functionality for owners
 */

'use client';

import { useState } from 'react';
import { useAccount, useEnsName, useReadContract } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { useCandidate } from '../hooks/useCandidates';
import { useSimulation } from '../hooks/useSimulation';
import { usePromoteCandidate } from '../hooks/usePromoteCandidate';
import { useCandidateActions } from '../utils/hooks/useCandidateActions';
import { ShareButton } from '../components/ShareButton';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { SimulationStatus } from '../components/SimulationStatus';
import { SponsorsPanel } from '../components/SponsorsPanel';
import { VoterRow } from '../components/VoterRow';
import { NOUNS_CONTRACTS } from '@/app/lib/nouns/contracts';
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

  const {
    promoteCandidate,
    isLoading: isPromoting,
    isSuccess: promoteSuccess,
    isError: promoteIsError,
    error: promoteError,
    proposalId: promotedProposalId,
    reset: resetPromote,
  } = usePromoteCandidate();

  // Get proposal threshold from the DAO contract
  const { data: proposalThreshold } = useReadContract({
    address: NOUNS_CONTRACTS.governor.address,
    abi: NOUNS_CONTRACTS.governor.abi,
    functionName: 'proposalThreshold',
  });

  // Get proposer's voting power
  const { data: proposerVotingPower } = useReadContract({
    address: NOUNS_CONTRACTS.token.address,
    abi: NOUNS_CONTRACTS.token.abi,
    functionName: 'getCurrentVotes',
    args: [proposer as `0x${string}`],
  });

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  // Track sponsor voting power from SponsorsPanel
  const [totalSponsorVotes, setTotalSponsorVotes] = useState(0);
  
  // Automatic simulation
  const simulation = useSimulation(candidate?.actions);

  const proposerDisplay = ensName || `${proposer.slice(0, 6)}...${proposer.slice(-4)}`;
  
  // Check if connected user is the candidate owner
  const isOwner = isConnected && address?.toLowerCase() === proposer.toLowerCase();
  const isCanceled = candidate?.canceled === true;

  // Calculate voting power for promotion eligibility
  const signatureCount = candidate?.signatures?.length || 0;
  const threshold = proposalThreshold ? Number(proposalThreshold) : 0;
  const proposerVotes = proposerVotingPower ? Number(proposerVotingPower) : 0;
  
  // Total voting power = proposer's nouns + sponsor nouns
  // The actual requirement is > threshold, so we need threshold + 1 nouns
  const requiredNouns = threshold + 1;
  const totalVotingPower = proposerVotes + totalSponsorVotes;
  const hasEnoughVotingPower = totalVotingPower >= requiredNouns;
  const canPromote = isOwner && !isCanceled && hasEnoughVotingPower;

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

  const handlePromoteClick = () => {
    setShowPromoteConfirm(true);
  };

  const handleConfirmPromote = async () => {
    if (!candidate) return;
    await promoteCandidate(candidate);
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
      {promoteSuccess && promotedProposalId && (
        <div className={styles.successMessage}>
          Candidate promoted to Proposal #{promotedProposalId}!{' '}
          <button
            className={styles.linkButton}
            onClick={() => onNavigate(`proposal/${promotedProposalId}`)}
          >
            View Proposal
          </button>
        </div>
      )}
      {promoteIsError && promoteError && (
        <div className={styles.errorMessage}>
          {promoteError.message.includes('user rejected') 
            ? 'Transaction was rejected' 
            : promoteError.message}
        </div>
      )}

      {/* Two-column layout on desktop */}
      <div className={styles.columns}>
        {/* Left Column: Description */}
        <div className={styles.leftColumn}>
          <div className={styles.description}>
            <h2 className={styles.sectionTitle}>Description</h2>
            <MarkdownRenderer 
              content={candidate.description} 
              className={styles.descriptionContent}
            />
          </div>
        </div>

        {/* Right Column: Simulation, Meta, Actions */}
        <div className={styles.rightColumn}>
          {/* Simulation Status */}
          <SimulationStatus
            result={simulation.result}
            isLoading={simulation.isLoading}
            error={simulation.error}
            hasActions={simulation.hasActions}
            actions={candidate.actions}
          />

          {/* Meta */}
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

          {/* Sponsors Panel */}
          <SponsorsPanel
            signatures={candidate.signatures || []}
            proposer={proposer}
            threshold={threshold}
            onNavigate={onNavigate}
            onSponsorVotesChange={setTotalSponsorVotes}
          />

          {/* Feedback Signals */}
          {candidate.feedback && candidate.feedback.length > 0 && (
            <div className={styles.feedbackSection}>
              <h2 className={styles.sectionTitle}>Feedback ({candidate.feedback.length})</h2>
              <div className={styles.feedbackList}>
                {candidate.feedback.map((f) => (
                  <VoterRow
                    key={f.id}
                    address={f.voter}
                    support={f.support}
                    votes={f.votes}
                    reason={f.reason}
                    timestamp={f.createdTimestamp}
                    isFeedback={false}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Owner Actions */}
          {isOwner && !isCanceled && (
            <div className={styles.ownerActions}>
              <span className={styles.ownerActionsLabel}>Owner</span>
              {canPromote && (
                <button
                  className={styles.promoteButton}
                  onClick={handlePromoteClick}
                  disabled={isPending || isConfirming || isPromoting}
                >
                  {isPromoting ? 'Promoting...' : 'Promote to Proposal'}
                </button>
              )}
              <button
                className={styles.editButton}
                onClick={handleEdit}
                disabled={isPending || isConfirming || isPromoting}
              >
                Edit Candidate
              </button>
              <button
                className={styles.cancelButton}
                onClick={handleCancelClick}
                disabled={isPending || isConfirming || isPromoting}
              >
                Cancel Candidate
              </button>
            </div>
          )}
        </div>
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

      {/* Promote Confirmation Dialog */}
      {showPromoteConfirm && (
        <div className={styles.confirmDialog}>
          <div className={styles.confirmDialogContent}>
            <h3 className={styles.confirmDialogTitle}>Promote to Proposal?</h3>
            <p className={styles.confirmDialogMessage}>
              This will submit the candidate as a full proposal using {signatureCount} sponsor signature{signatureCount !== 1 ? 's' : ''}.
              Once promoted, the proposal will enter the voting period.
            </p>
            <div className={styles.confirmDialogButtons}>
              <button
                className={styles.confirmDialogCancel}
                onClick={() => {
                  setShowPromoteConfirm(false);
                  resetPromote();
                }}
                disabled={isPromoting}
              >
                Cancel
              </button>
              <button
                className={styles.confirmDialogPromote}
                onClick={handleConfirmPromote}
                disabled={isPromoting}
              >
                {isPromoting ? 'Promoting...' : 'Promote to Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

