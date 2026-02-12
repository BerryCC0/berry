/**
 * ProposalDetailView
 * Full proposal detail with voting
 * Desktop: Two-column layout (description left, voting/activity right)
 * Mobile: Tabbed view (Description, Transactions, Activity, Sponsors)
 */

'use client';

import { useTranslation } from '@/OS/lib/i18n';
import { useIsMobile } from '@/OS/lib/PlatformDetection';
import { useProposalDetail } from '../hooks/useProposalDetail';
import { stripTitleFromDescription } from '../utils/descriptionUtils';
import { AddressWithAvatar } from '../components/AddressWithAvatar';
import { TransactionSummary } from '../components/TransactionSummary';
import { ShareButton } from '../components/ShareButton';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { SimulationStatus } from '../components/SimulationStatus';
import { VoterRow } from '../components/VoterRow';
import { BerryLoader } from '../components/BerryLoader';
import { DetailTabs, useDetailTabs } from '../components/DetailTabs';
import { getClientName } from '@/OS/lib/clientNames';
import styles from './ProposalDetailView.module.css';

interface ProposalDetailViewProps {
  proposalId: string;
  onNavigate: (path: string) => void;
  onBack: () => void;
}

export function ProposalDetailView({ proposalId, onNavigate, onBack }: ProposalDetailViewProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const detail = useProposalDetail(proposalId, onNavigate);
  const { activeTab, setActiveTab } = useDetailTabs('description');

  const {
    proposal, isLoading, error, activity, voteCounts, simulation,
    shouldSkipSimulation, timeRemaining,
    isConnected, address, hasAlreadyVoted, userVoteSupport, hasVotingPower,
    isActive, canVote,
    actionReason, setActionReason, actionMode, setActionMode,
    showModeDropdown, setShowModeDropdown, showSuccess, dropdownRef,
    handleAction, isActionPending, isActionConfirming,
    proposalActions, showCancelConfirm, setShowCancelConfirm,
    proposerActionError, proposerActionSuccess,
    handleCancelProposal, handleQueueProposal, handleExecuteProposal, handleEditProposal,
    formatTimeRemaining,
  } = detail;

  if (error) {
    return (
      <div className={styles.error}>
        <button className={styles.backButton} onClick={onBack}>← Back</button>
        <p>Failed to load proposal</p>
      </div>
    );
  }

  if (isLoading || !proposal) {
    return (
      <div className={styles.loading}>
        <button className={styles.backButton} onClick={onBack}>← Back</button>
        <BerryLoader />
      </div>
    );
  }

  // ================================================================
  // Shared content sections (used by both desktop and mobile layouts)
  // ================================================================

  const headerContent = (
    <>
      <div className={styles.navBar}>
        <button className={styles.backButton} onClick={onBack}>← Back</button>
        <ShareButton path={`proposal/${proposalId}`} />
      </div>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.id}>Proposal #{proposal.id}</span>
          {proposal.clientId !== undefined && proposal.clientId !== 0 && (
            <span className={styles.clientBadge}>
              via {getClientName(proposal.clientId)}
            </span>
          )}
        </div>
        <span className={`${styles.status} ${styles[proposal.status.toLowerCase()]}`}>
          {proposal.status}
        </span>
      </div>

      <h1 className={styles.title}>{proposal.title}</h1>
      
      <div className={styles.proposalMeta}>
        <span className={styles.metaDate}>
          Proposed {new Date(Number(proposal.createdTimestamp) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        <span className={styles.metaSeparator}>by</span>
        <AddressWithAvatar 
          address={proposal.proposer} 
          onClick={() => onNavigate(`voter/${proposal.proposer}`)}
        />
        {proposal.signers && proposal.signers.length > 0 && (
          <>
            <span className={styles.metaSeparator}>, sponsored by</span>
            {proposal.signers.slice(0, 3).map((signer, i) => (
              <span key={signer}>
                {i > 0 && <span className={styles.metaSeparator}> </span>}
                <AddressWithAvatar 
                  address={signer} 
                  onClick={() => onNavigate(`voter/${signer}`)}
                />
              </span>
            ))}
            {proposal.signers.length > 3 && (
              <span className={styles.metaMore}>+{proposal.signers.length - 3} more</span>
            )}
          </>
        )}
      </div>
    </>
  );

  /** User vote status + time remaining (shown above tabs on mobile, in right col on desktop) */
  const statusSection = (
    <>
      {hasAlreadyVoted && userVoteSupport !== undefined && (
        <div className={styles.userVoteStatus}>
          <span className={styles.userVoteText}>You voted </span>
          <span className={
            userVoteSupport === 1 ? styles.voteFor : 
            userVoteSupport === 0 ? styles.voteAgainst : 
            styles.voteAbstain
          }>
            {userVoteSupport === 1 ? 'FOR' : userVoteSupport === 0 ? 'AGAINST' : 'ABSTAIN'}
          </span>
        </div>
      )}
      
      {timeRemaining && timeRemaining.type !== 'ended' && (
        <div className={styles.timeRemaining}>
          <span className={styles.timeIcon}>⏱</span>
          <span className={styles.timeText}>
            {timeRemaining.type === 'pending' 
              ? `Voting starts in ${formatTimeRemaining(timeRemaining.seconds)}`
              : `Voting ends in ${formatTimeRemaining(timeRemaining.seconds)}`
            }
          </span>
        </div>
      )}
    </>
  );

  /** Proposer actions toolbar */
  const proposerActionsSection = proposal && proposalActions.isProposer(proposal, address) ? (
    <div className={styles.proposerActions}>
      <span className={styles.proposerActionsLabel}>Proposer</span>
      
      {proposerActionSuccess && (
        <div className={styles.successMessage}>{proposerActionSuccess}</div>
      )}
      {proposerActionError && (
        <div className={styles.errorMessage}>{proposerActionError}</div>
      )}
      
      {proposalActions.canUpdate(proposal, address) && (
        <button
          className={styles.editButton}
          onClick={handleEditProposal}
          disabled={proposalActions.isPending || proposalActions.isConfirming}
        >
          Edit Proposal
        </button>
      )}
      
      {proposalActions.canQueue(proposal) && (
        <button
          className={styles.queueButton}
          onClick={handleQueueProposal}
          disabled={proposalActions.isPending || proposalActions.isConfirming}
        >
          {proposalActions.isPending || proposalActions.isConfirming ? 'Queueing...' : 'Queue Proposal'}
        </button>
      )}
      
      {proposalActions.canExecute(proposal) && (
        <button
          className={styles.executeButton}
          onClick={handleExecuteProposal}
          disabled={proposalActions.isPending || proposalActions.isConfirming}
        >
          {proposalActions.isPending || proposalActions.isConfirming ? 'Executing...' : 'Execute Proposal'}
        </button>
      )}
      
      {proposalActions.canCancel(proposal, address) && (
        <>
          {!showCancelConfirm ? (
            <button
              className={styles.cancelProposalButton}
              onClick={() => setShowCancelConfirm(true)}
              disabled={proposalActions.isPending || proposalActions.isConfirming}
            >
              Cancel Proposal
            </button>
          ) : (
            <div className={styles.confirmCancel}>
              <span className={styles.confirmText}>Are you sure?</span>
              <button
                className={styles.confirmYes}
                onClick={handleCancelProposal}
                disabled={proposalActions.isPending || proposalActions.isConfirming}
              >
                {proposalActions.isPending || proposalActions.isConfirming ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
              <button
                className={styles.confirmNo}
                onClick={() => setShowCancelConfirm(false)}
                disabled={proposalActions.isPending || proposalActions.isConfirming}
              >
                No
              </button>
            </div>
          )}
        </>
      )}
    </div>
  ) : null;

  /** Description content (transaction summary + markdown) */
  const descriptionContent = (
    <>
      {proposal.actions && proposal.actions.length > 0 && (
        <TransactionSummary actions={proposal.actions} />
      )}
      
      <div className={styles.description}>
        <h2 className={styles.sectionTitle}>{t('common.description')}</h2>
        <MarkdownRenderer 
          content={stripTitleFromDescription(proposal.description, proposal.title)} 
          className={styles.descriptionContent}
        />
      </div>
    </>
  );

  /** Transactions / Simulation content */
  const transactionsContent = (
    <SimulationStatus
      result={simulation.result}
      isLoading={simulation.isLoading}
      error={simulation.error}
      hasActions={simulation.hasActions}
      actions={proposal.actions}
      skipSimulation={shouldSkipSimulation}
    />
  );

  /** Vote counts bar */
  const voteCountsContent = voteCounts ? (
    <div className={styles.voteSection}>
      <div className={styles.voteLabelsRow}>
        <span className={styles.forLabel}>For {voteCounts.forVotes}</span>
        <span className={styles.rightLabels}>
          {voteCounts.abstainVotes > 0 && (
            <span className={styles.abstainLabel}>Abstain {voteCounts.abstainVotes}</span>
          )}
          {voteCounts.abstainVotes > 0 && voteCounts.againstVotes > 0 && <span className={styles.labelSeparator}>·</span>}
          {voteCounts.againstVotes > 0 && (
            <span className={styles.againstLabel}>Against {voteCounts.againstVotes}</span>
          )}
        </span>
      </div>

      <div className={styles.voteBarContainer}>
        <div 
          className={styles.forSection}
          style={{ width: `${voteCounts.forWidth}%` }}
        >
          {(proposal.votes || [])
            .filter((v: { support: number }) => v.support === 1)
            .sort((a: { votes: string }, b: { votes: string }) => Number(b.votes) - Number(a.votes))
            .map((v: { id: string; votes: string }) => (
              <div 
                key={`for-${v.id}`}
                className={styles.voteBlock}
                style={{ flex: Number(v.votes), backgroundColor: '#43a047' }}
              />
            ))}
        </div>
        
        {voteCounts.gapWidth > 0 && (
          <div className={styles.quorumSpace} style={{ width: `${voteCounts.gapWidth}%` }} />
        )}

        <div 
          className={styles.quorumMarker} 
          style={{ left: `${voteCounts.quorumPosition}%` }}
        />

        {voteCounts.abstainVotes > 0 && (
          <div className={styles.abstainSection} style={{ width: `${voteCounts.abstainWidth}%` }}>
            {(proposal.votes || [])
              .filter((v: { support: number }) => v.support === 2)
              .map((v: { id: string; votes: string }) => (
                <div 
                  key={`abstain-${v.id}`}
                  className={styles.voteBlock}
                  style={{ flex: Number(v.votes), backgroundColor: '#757575' }}
                />
              ))}
          </div>
        )}

        {voteCounts.againstVotes > 0 && (
          <div className={styles.againstSection} style={{ width: `${voteCounts.againstWidth}%` }}>
            {(proposal.votes || [])
              .filter((v: { support: number }) => v.support === 0)
              .sort((a: { votes: string }, b: { votes: string }) => Number(b.votes) - Number(a.votes))
              .map((v: { id: string; votes: string }) => (
                <div 
                  key={`against-${v.id}`}
                  className={styles.voteBlock}
                  style={{ flex: Number(v.votes), backgroundColor: '#e53935' }}
                />
              ))}
          </div>
        )}
      </div>

      <div className={styles.quorumRow}>
        <span className={styles.quorumLabel}>
          Quorum {voteCounts.quorum} {voteCounts.quorumMet ? '(met)' : ''}
        </span>
      </div>
    </div>
  ) : null;

  /** Vote/Comment action box */
  const actionBoxContent = isConnected && hasVotingPower ? (
    <div className={styles.actionBox}>
      <div className={styles.actionHeader}>
        <span className={styles.actionLabel}>
          {actionMode === 'vote' ? 'Cast vote' : 'Comment onchain'}
        </span>
        
        {canVote && (
          <div className={styles.modeSelector} ref={dropdownRef}>
            <button
              type="button"
              className={styles.modeTrigger}
              onClick={() => setShowModeDropdown(!showModeDropdown)}
            >
              {actionMode === 'vote' ? 'Cast vote' : 'Comment onchain'}
              <span className={styles.modeArrow}>▼</span>
            </button>
            
            {showModeDropdown && (
              <div className={styles.modeDropdown}>
                <button
                  type="button"
                  className={`${styles.modeOption} ${actionMode === 'vote' ? styles.modeSelected : ''}`}
                  onClick={() => { setActionMode('vote'); setShowModeDropdown(false); }}
                >
                  <span>Cast vote</span>
                  {actionMode === 'vote' && <span className={styles.modeCheck}>✓</span>}
                </button>
                <button
                  type="button"
                  className={`${styles.modeOption} ${actionMode === 'comment' ? styles.modeSelected : ''}`}
                  onClick={() => { setActionMode('comment'); setShowModeDropdown(false); }}
                >
                  <span>Comment onchain</span>
                  {actionMode === 'comment' && <span className={styles.modeCheck}>✓</span>}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {actionMode === 'comment' && (
        <p className={styles.actionDescription}>
          {hasAlreadyVoted 
            ? 'You have already voted. Add a comment to share additional thoughts.'
            : !isActive 
              ? <>Voting is not active.<br />Leave a comment to share your position.</>
              : 'Comments are non-binding feedback visible onchain.'}
        </p>
      )}
      
      {actionMode === 'vote' && (
        <p className={styles.actionDescription}>
          Gas spent on voting will be refunded.
        </p>
      )}
      
      {(isActionPending || isActionConfirming || showSuccess) && (
        <div className={`${styles.txStatus} ${
          showSuccess ? styles.txSuccess : 
          isActionConfirming ? styles.txConfirming : 
          styles.txPending
        }`}>
          {isActionPending && 'Waiting for wallet...'}
          {isActionConfirming && !isActionPending && 'Confirming transaction...'}
          {showSuccess && (actionMode === 'vote' ? 'Vote submitted!' : 'Comment posted!')}
        </div>
      )}
      
      <textarea
        className={styles.reasonInput}
        placeholder={actionMode === 'vote' 
          ? 'Optional: Add a reason for your vote...' 
          : 'Add your comment...'}
        value={actionReason}
        onChange={(e) => setActionReason(e.target.value)}
        disabled={isActionPending || isActionConfirming}
      />
      
      <div className={styles.actionButtons}>
        <button 
          className={`${styles.actionButton} ${styles.actionFor}`}
          onClick={() => handleAction(1)}
          disabled={isActionPending || isActionConfirming}
        >
          {isActionPending || isActionConfirming ? '...' : 'For'}
        </button>
        <button 
          className={`${styles.actionButton} ${styles.actionAgainst}`}
          onClick={() => handleAction(0)}
          disabled={isActionPending || isActionConfirming}
        >
          {isActionPending || isActionConfirming ? '...' : 'Against'}
        </button>
        <button 
          className={`${styles.actionButton} ${styles.actionAbstain}`}
          onClick={() => handleAction(2)}
          disabled={isActionPending || isActionConfirming}
        >
          {isActionPending || isActionConfirming ? '...' : 'Abstain'}
        </button>
      </div>
    </div>
  ) : null;

  /** Activity feed */
  const activityContent = activity.length > 0 ? (
    <div className={styles.activitySection}>
      <h2 className={styles.sectionTitle}>
        Activity ({activity.length})
      </h2>
      <div className={styles.activityList}>
        {activity.map((item) => (
          <VoterRow
            key={item.id}
            address={item.address}
            support={item.support}
            votes={item.votes}
            reason={item.reason}
            timestamp={item.timestamp}
            clientId={item.clientId}
            isFeedback={item.type === 'feedback'}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  ) : null;

  // ================================================================
  // Layout: Mobile (tabbed) vs Desktop (two-column)
  // ================================================================

  if (isMobile) {
    const tabs = [
      { id: 'description', label: 'Description' },
      { id: 'transactions', label: 'Transactions' },
      { id: 'activity', label: 'Activity', count: activity.length },
      ...(proposal.signers && proposal.signers.length > 0
        ? [{ id: 'sponsors', label: 'Sponsors' }]
        : []),
    ];

    return (
      <div className={styles.container}>
        {headerContent}
        
        {/* Always-visible status section on mobile */}
        <div className={styles.mobileStatus}>
          {statusSection}
          {proposerActionsSection}
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
                    {voteCountsContent}
                    {actionBoxContent}
                    {activityContent}
                  </>
                );
              case 'sponsors':
                return (
                  <div className={styles.sponsorsTab}>
                    <div className={styles.sponsorItem}>
                      <span className={styles.sponsorLabel}>Proposer</span>
                      <AddressWithAvatar 
                        address={proposal.proposer} 
                        onClick={() => onNavigate(`voter/${proposal.proposer}`)}
                      />
                    </div>
                    {proposal.signers && proposal.signers.length > 0 && (
                      <div className={styles.sponsorItem}>
                        <span className={styles.sponsorLabel}>Sponsors ({proposal.signers.length})</span>
                        <div className={styles.sponsorList}>
                          {proposal.signers.map((signer) => (
                            <AddressWithAvatar 
                              key={signer}
                              address={signer} 
                              onClick={() => onNavigate(`voter/${signer}`)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              default:
                return descriptionContent;
            }
          }}
        </DetailTabs>
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

        {/* Right Column: Simulation, Votes, Actions */}
        <div className={styles.rightColumn}>
          {statusSection}
          {proposerActionsSection}
          {transactionsContent}
          {voteCountsContent}
          {actionBoxContent}
          {activityContent}
        </div>
      </div>
    </div>
  );
}
