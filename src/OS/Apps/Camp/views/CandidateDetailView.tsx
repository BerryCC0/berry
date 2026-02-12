/**
 * CandidateDetailView
 * Full candidate detail view with edit/cancel/promote functionality for owners
 * Desktop: Two-column layout (description left, actions/sponsors right)
 * Mobile: Tabbed view (Description, Transactions, Activity, Sponsors)
 */

'use client';

import { useIsMobile } from '@/OS/lib/PlatformDetection';
import { useCandidateDetail } from '../hooks/useCandidateDetail';
import { stripTitleFromDescription } from '../utils/descriptionUtils';
import { ShareButton } from '../components/ShareButton';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { SimulationStatus } from '../components/SimulationStatus';
import { TransactionSummary } from '../components/TransactionSummary';
import { SponsorsPanel } from '../components/SponsorsPanel';
import { VoterRow } from '../components/VoterRow';
import { BerryLoader } from '../components/BerryLoader';
import { DetailTabs, useDetailTabs } from '../components/DetailTabs';
import styles from './CandidateDetailView.module.css';

interface CandidateDetailViewProps {
  proposer: string;
  slug: string;
  onNavigate: (path: string) => void;
  onBack: () => void;
}

export function CandidateDetailView({ proposer, slug, onNavigate, onBack }: CandidateDetailViewProps) {
  const isMobile = useIsMobile();
  const detail = useCandidateDetail(proposer, slug, onNavigate);
  const { activeTab, setActiveTab } = useDetailTabs('description');

  const {
    candidate, isLoading, error, simulation, actualProposer,
    title, createdDate, proposerDisplay,
    isConnected, hasVotingPower, isOwner, isCanceled,
    canPromote, signatureCount, threshold, setTotalSponsorVotes,
    isPending, isConfirming, isPromoting,
    promoteSuccess, promoteIsError, promoteError, promotedProposalId,
    showPromoteConfirm, setShowPromoteConfirm,
    showCancelConfirm, setShowCancelConfirm,
    cancelSuccess, cancelError,
    handleEdit, handleCancelClick, handleConfirmCancel,
    handlePromoteClick, handleConfirmPromote, resetPromote,
    signalReason, setSignalReason, signalPending, signalConfirming,
    showSignalSuccess, handleSignal,
    refetch,
  } = detail;

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
        <BerryLoader />
      </div>
    );
  }

  // ================================================================
  // Status badge
  // ================================================================

  const getStatusBadge = () => {
    if (isCanceled) {
      return <span className={`${styles.statusBadge} ${styles.statusCanceled}`}>Canceled</span>;
    }
    return <span className={`${styles.statusBadge} ${styles.statusActive}`}>Active</span>;
  };

  // ================================================================
  // Shared content sections
  // ================================================================

  const headerContent = (
    <>
      <div className={styles.navBar}>
        <button className={styles.backButton} onClick={onBack}>Back</button>
        <ShareButton path={`c/${slug}`} />
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
    </>
  );

  /** Owner actions toolbar */
  const ownerActionsSection = isOwner && !isCanceled ? (
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
  ) : null;

  /** Description content */
  const descriptionContent = (
    <>
      {candidate.actions && candidate.actions.length > 0 && (
        <TransactionSummary actions={candidate.actions} />
      )}
      <div className={styles.description}>
        <h2 className={styles.sectionTitle}>Description</h2>
        <MarkdownRenderer 
          content={stripTitleFromDescription(candidate.description, candidate.title || '')} 
          className={styles.descriptionContent}
        />
      </div>
    </>
  );

  /** Transactions / Simulation */
  const transactionsContent = (
    <SimulationStatus
      result={simulation.result}
      isLoading={simulation.isLoading}
      error={simulation.error}
      hasActions={simulation.hasActions}
      actions={candidate.actions}
    />
  );

  /** Meta section */
  const metaContent = (
    <div className={styles.meta}>
      <div className={styles.metaItem}>
        <span className={styles.metaLabel}>Proposer</span>
        <span 
          className={styles.metaValue}
          onClick={() => onNavigate(`voter/${actualProposer}`)}
          style={{ cursor: 'pointer' }}
        >
          {proposerDisplay}
        </span>
      </div>
      <div className={styles.metaItem}>
        <span className={styles.metaLabel}>Created</span>
        <span className={styles.metaValue}>
          {createdDate?.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })}
        </span>
      </div>
    </div>
  );

  /** Sponsors panel */
  const sponsorsContent = (
    <SponsorsPanel
      signatures={candidate.signatures || []}
      proposer={actualProposer}
      threshold={threshold}
      onNavigate={onNavigate}
      onSponsorVotesChange={setTotalSponsorVotes}
      candidate={candidate}
      onSponsorSuccess={() => refetch()}
    />
  );

  /** Feedback section */
  const feedbackContent = candidate.feedback && candidate.feedback.length > 0 ? (
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
  ) : null;

  /** Comment box */
  const commentBoxContent = isConnected && hasVotingPower && !isCanceled ? (
    <div className={styles.commentBox}>
      <div className={styles.commentHeader}>
        <span className={styles.commentLabel}>Comment onchain</span>
      </div>
      <p className={styles.commentDescription}>
        Share your position on this candidate. Comments help proposers gauge community sentiment.
      </p>
      
      {(signalPending || signalConfirming || showSignalSuccess) && (
        <div className={`${styles.txStatus} ${
          showSignalSuccess ? styles.txSuccess : 
          signalConfirming ? styles.txConfirming : 
          styles.txPending
        }`}>
          {signalPending && 'Waiting for wallet...'}
          {signalConfirming && !signalPending && 'Confirming transaction...'}
          {showSignalSuccess && 'Comment posted!'}
        </div>
      )}
      
      <textarea
        className={styles.commentInput}
        placeholder="Add your comment..."
        value={signalReason}
        onChange={(e) => setSignalReason(e.target.value)}
        disabled={signalPending || signalConfirming}
      />
      <div className={styles.commentButtons}>
        <button
          className={`${styles.commentButton} ${styles.commentFor}`}
          onClick={() => handleSignal(1)}
          disabled={signalPending || signalConfirming}
        >
          {signalPending || signalConfirming ? '...' : 'For'}
        </button>
        <button
          className={`${styles.commentButton} ${styles.commentAgainst}`}
          onClick={() => handleSignal(0)}
          disabled={signalPending || signalConfirming}
        >
          {signalPending || signalConfirming ? '...' : 'Against'}
        </button>
        <button
          className={`${styles.commentButton} ${styles.commentAbstain}`}
          onClick={() => handleSignal(2)}
          disabled={signalPending || signalConfirming}
        >
          {signalPending || signalConfirming ? '...' : 'Abstain'}
        </button>
      </div>
    </div>
  ) : null;

  /** Confirmation dialogs (shared between both layouts) */
  const dialogs = (
    <>
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
    </>
  );

  // ================================================================
  // Layout: Mobile (tabbed) vs Desktop (two-column)
  // ================================================================

  if (isMobile) {
    const feedbackCount = candidate.feedback?.length || 0;
    const sponsorCount = candidate.signatures?.filter(s => !s.canceled).length || 0;

    const tabs = [
      { id: 'description', label: 'Description' },
      { id: 'transactions', label: 'Transactions' },
      { id: 'activity', label: 'Activity', count: feedbackCount },
      { id: 'sponsors', label: 'Sponsors', count: sponsorCount },
    ];

    return (
      <div className={styles.container}>
        {headerContent}

        {/* Always-visible actions on mobile */}
        <div className={styles.mobileStatus}>
          {ownerActionsSection}
        </div>

        <DetailTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        >
          {(currentTab) => {
            switch (currentTab) {
              case 'description':
                return descriptionContent;
              case 'transactions':
                return transactionsContent;
              case 'activity':
                return (
                  <>
                    {feedbackContent}
                    {commentBoxContent}
                  </>
                );
              case 'sponsors':
                return (
                  <>
                    {metaContent}
                    {sponsorsContent}
                  </>
                );
              default:
                return descriptionContent;
            }
          }}
        </DetailTabs>

        {dialogs}
      </div>
    );
  }

  // Desktop: Two-column layout (unchanged)
  return (
    <div className={styles.container}>
      {headerContent}

      <div className={styles.columns}>
        {/* Left Column: Description */}
        <div className={styles.leftColumn}>
          {descriptionContent}
        </div>

        {/* Right Column: Simulation, Meta, Actions */}
        <div className={styles.rightColumn}>
          {ownerActionsSection}
          {transactionsContent}
          {metaContent}
          {sponsorsContent}
          {feedbackContent}
          {commentBoxContent}
        </div>
      </div>

      {dialogs}
    </div>
  );
}
