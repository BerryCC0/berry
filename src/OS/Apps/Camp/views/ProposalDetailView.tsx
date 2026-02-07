/**
 * ProposalDetailView
 * Full proposal detail with voting
 */

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useAccount, useReadContract, useEnsName, useEnsAvatar, useBlockNumber } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { useTranslation } from '@/OS/lib/i18n';
import { useProposal, useSignal } from '../hooks';
import { useSimulation } from '../hooks/useSimulation';
import { useProposalActions } from '../utils/hooks/useProposalActions';
import { useVote } from '@/app/lib/nouns/hooks';
import { NOUNS_CONTRACTS } from '@/app/lib/nouns/contracts';
import { ShareButton } from '../components/ShareButton';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { SimulationStatus } from '../components/SimulationStatus';
import { VoterRow } from '../components/VoterRow';
import { getClientName } from '@/src/OS/Apps/NounsAuction/utils/clientNames';
import { decodeTransactions, type DecodedTransaction } from '../utils/transactionDecoder';
import styles from './ProposalDetailView.module.css';

/**
 * AddressWithAvatar - Displays an address with ENS avatar and name
 */
function AddressWithAvatar({ address, onClick }: { address: string; onClick?: () => void }) {
  const { data: ensName } = useEnsName({
    address: address as `0x${string}`,
    chainId: mainnet.id,
  });
  
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName || undefined,
    chainId: mainnet.id,
  });
  
  const displayName = ensName || `${address.slice(0, 6)}...${address.slice(-4)}`;
  
  return (
    <span className={styles.addressWithAvatar} onClick={onClick}>
      {ensAvatar ? (
        <img src={ensAvatar} alt="" className={styles.miniAvatar} />
      ) : (
        <span className={styles.miniAvatarPlaceholder} />
      )}
      <span className={styles.addressName}>{displayName}</span>
    </span>
  );
}

/**
 * TransactionSummary - Shows a summary box of what the proposal requests
 */
function TransactionSummary({ actions }: { actions: { target: string; value: string; signature: string; calldata: string }[] }) {
  const decodedTransactions = useMemo(() => {
    return decodeTransactions(actions);
  }, [actions]);
  
  if (decodedTransactions.length === 0) return null;
  
  // Group similar transactions for summary
  const summary = useMemo(() => {
    const groups: { type: string; count: number; details: string }[] = [];
    
    for (const tx of decodedTransactions) {
      // Categorize by title prefix
      const title = tx.title;
      
      if (title.startsWith('Transfer') && title.includes('ETH')) {
        const existing = groups.find(g => g.type === 'ETH Transfer');
        // Strip "Transfer " prefix since we add "Requesting " in the display
        const amount = title.replace(/^Transfer\s+/, '');
        if (existing) {
          existing.count++;
        } else {
          groups.push({ type: 'ETH Transfer', count: 1, details: amount });
        }
      } else if (title.startsWith('Transfer') || title.startsWith('Fund')) {
        const existing = groups.find(g => g.type === 'Token Transfer');
        // Strip "Transfer " or "Fund " prefix since we add "Requesting " in the display
        const amount = title.replace(/^(Transfer|Fund)\s+/, '');
        // Determine source: Payer Contract or Treasury
        const isPayer = tx.description?.includes('Payer');
        const source = isPayer ? 'via Payer' : 'via Treasury';
        if (existing) {
          existing.count++;
          existing.details = `${existing.count} transfers`;
        } else {
          groups.push({ type: 'Token Transfer', count: 1, details: `${amount} ${source}` });
        }
      } else if (title.startsWith('Stream')) {
        const existing = groups.find(g => g.type === 'Stream');
        if (existing) {
          existing.count++;
          existing.details = `${existing.count} streams`;
        } else {
          groups.push({ type: 'Stream', count: 1, details: title + (tx.description ? ` (${tx.description})` : '') });
        }
      } else if (title.includes('Noun')) {
        groups.push({ type: 'Noun Transfer', count: 1, details: title });
      } else if (title.startsWith('Approve')) {
        groups.push({ type: 'Approval', count: 1, details: title });
      } else if (title.startsWith('Delegate')) {
        groups.push({ type: 'Delegation', count: 1, details: title });
      } else {
        groups.push({ type: 'Contract Call', count: 1, details: title + (tx.description ? ` - ${tx.description}` : '') });
      }
    }
    
    return groups;
  }, [decodedTransactions]);
  
  return (
    <div className={styles.txSummary}>
      <div className={styles.txSummaryContent}>
        {summary.map((item, i) => (
          <div key={i} className={styles.txSummaryItem}>
            <span className={styles.txSummaryTitle}>
              {item.type === 'Token Transfer' && 'Requesting '}
              {item.type === 'ETH Transfer' && 'Requesting '}
              {item.type === 'Stream'}
              {item.type === 'Noun Transfer' && '⌐◨-◨ '}
              {item.type === 'Approval'}
              {item.type === 'Delegation'}
              {item.type === 'Contract Call'}
              {item.details}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ProposalDetailViewProps {
  proposalId: string;
  onNavigate: (path: string) => void;
  onBack: () => void;
}

/**
 * Strip the title from the description
 * The API returns description with title at the start (e.g., "# Title\n\nDescription...")
 */
function stripTitleFromDescription(description: string, title: string): string {
  // Common patterns for title in description:
  // 1. "# Title\n\n" (markdown heading)
  // 2. "Title\n\n" (plain text at start)
  // 3. "# Title\n" (markdown heading with single newline)
  
  let stripped = description;
  
  // Try to remove markdown heading version first
  const markdownTitlePattern = new RegExp(`^#\\s*${escapeRegex(title)}\\s*\\n+`, 'i');
  if (markdownTitlePattern.test(stripped)) {
    stripped = stripped.replace(markdownTitlePattern, '');
  } else {
    // Try plain text title at start
    const plainTitlePattern = new RegExp(`^${escapeRegex(title)}\\s*\\n+`, 'i');
    if (plainTitlePattern.test(stripped)) {
      stripped = stripped.replace(plainTitlePattern, '');
    }
  }
  
  return stripped.trim();
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Statuses where simulation doesn't make sense (already finalized)
const SKIP_SIMULATION_STATUSES = ['EXECUTED', 'DEFEATED', 'VETOED', 'CANCELLED', 'EXPIRED'];

type ActionMode = 'vote' | 'comment';

export function ProposalDetailView({ proposalId, onNavigate, onBack }: ProposalDetailViewProps) {
  const { t } = useTranslation();
  const { data: proposal, isLoading, error, refetch } = useProposal(proposalId);
  const { isConnected, address } = useAccount();
  const { voteRefundable, isPending, isConfirming, isSuccess, hash } = useVote();
  const {
    sendProposalSignal,
    isPending: signalPending,
    isConfirming: signalConfirming,
    isSuccess: signalSuccess,
    hasVotingPower,
    reset: resetSignal,
  } = useSignal(address);
  
  // Proposal management actions (for proposers)
  const proposalActions = useProposalActions();
  
  // Check if user has already voted
  const { data: voteReceipt } = useReadContract({
    address: NOUNS_CONTRACTS.governor.address,
    abi: NOUNS_CONTRACTS.governor.abi,
    functionName: 'getReceipt',
    args: address ? [BigInt(proposalId), address] : undefined,
  });
  
  const hasAlreadyVoted = voteReceipt?.hasVoted ?? false;
  const userVoteSupport = (voteReceipt as { support?: number } | undefined)?.support;
  
  // Get current block number for time remaining
  const { data: blockNumber } = useBlockNumber({ watch: true });
  
  // Calculate time remaining
  const timeRemaining = useMemo(() => {
    if (!blockNumber || !proposal?.startBlock || !proposal?.endBlock) return null;
    
    const currentBlock = Number(blockNumber);
    const startBlock = Number(proposal.startBlock);
    const endBlock = Number(proposal.endBlock);
    const SECONDS_PER_BLOCK = 12;
    
    // Voting hasn't started yet
    if (currentBlock < startBlock) {
      const blocksUntilStart = startBlock - currentBlock;
      const secondsUntilStart = blocksUntilStart * SECONDS_PER_BLOCK;
      return { type: 'pending' as const, seconds: secondsUntilStart };
    }
    
    // Voting is active
    if (currentBlock < endBlock) {
      const blocksRemaining = endBlock - currentBlock;
      const secondsRemaining = blocksRemaining * SECONDS_PER_BLOCK;
      return { type: 'active' as const, seconds: secondsRemaining };
    }
    
    // Voting has ended
    return { type: 'ended' as const, seconds: 0 };
  }, [blockNumber, proposal?.startBlock, proposal?.endBlock]);
  
  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Ended';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  };
  
  // State
  const [actionReason, setActionReason] = useState('');
  const [actionMode, setActionMode] = useState<ActionMode>('vote');
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Proposer action states
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [proposerActionError, setProposerActionError] = useState<string | null>(null);
  const [proposerActionSuccess, setProposerActionSuccess] = useState<string | null>(null);
  
  // Determine if voting is active
  const isActive = proposal?.status === 'ACTIVE' || proposal?.status === 'OBJECTION_PERIOD';
  
  // Can user cast a vote? Only if active AND hasn't voted
  const canVote = isActive && !hasAlreadyVoted;
  
  // Auto-switch to comment mode if user can't vote
  // Only run after proposal has loaded to avoid premature switching
  useEffect(() => {
    if (proposal && !canVote && actionMode === 'vote') {
      setActionMode('comment');
    }
  }, [proposal, canVote, actionMode]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModeDropdown(false);
      }
    }
    if (showModeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModeDropdown]);

  // Clear reason and show success message when transaction is confirmed
  useEffect(() => {
    if (isSuccess && hash) {
      setActionReason('');
      setShowSuccess(true);
      refetch();
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, hash, refetch]);

  useEffect(() => {
    if (signalSuccess) {
      setActionReason('');
      setShowSuccess(true);
      resetSignal();
      refetch();
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [signalSuccess, resetSignal, refetch]);

  const handleAction = async (support: 0 | 1 | 2) => {
    try {
      if (actionMode === 'vote') {
        voteRefundable(BigInt(proposalId), support, actionReason);
      } else {
        await sendProposalSignal(BigInt(proposalId), support, actionReason);
      }
    } catch (err) {
      console.error('Failed to send action:', err);
    }
  };
  
  const isActionPending = actionMode === 'vote' ? isPending : signalPending;
  const isActionConfirming = actionMode === 'vote' ? isConfirming : signalConfirming;
  
  // Proposer action handlers
  const handleCancelProposal = async () => {
    setProposerActionError(null);
    try {
      await proposalActions.cancelProposal(proposalId);
      setProposerActionSuccess('Proposal cancelled successfully');
      setShowCancelConfirm(false);
      setTimeout(() => refetch(), 2000);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('user rejected')) {
          setProposerActionError('Transaction was rejected');
        } else {
          setProposerActionError(err.message);
        }
      } else {
        setProposerActionError('Failed to cancel proposal');
      }
    }
  };
  
  const handleQueueProposal = async () => {
    setProposerActionError(null);
    try {
      await proposalActions.queueProposal(proposalId);
      setProposerActionSuccess('Proposal queued successfully');
      setTimeout(() => refetch(), 2000);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('user rejected')) {
          setProposerActionError('Transaction was rejected');
        } else {
          setProposerActionError(err.message);
        }
      } else {
        setProposerActionError('Failed to queue proposal');
      }
    }
  };
  
  const handleExecuteProposal = async () => {
    setProposerActionError(null);
    try {
      await proposalActions.executeProposal(proposalId);
      setProposerActionSuccess('Proposal executed successfully');
      setTimeout(() => refetch(), 2000);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('user rejected')) {
          setProposerActionError('Transaction was rejected');
        } else {
          setProposerActionError(err.message);
        }
      } else {
        setProposerActionError('Failed to execute proposal');
      }
    }
  };
  
  const handleEditProposal = () => {
    // Navigate to create view with edit mode for this proposal
    onNavigate(`create/edit-proposal/${proposalId}`);
  };
  
  // Clear proposer action success after a delay
  useEffect(() => {
    if (proposerActionSuccess) {
      const timer = setTimeout(() => setProposerActionSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [proposerActionSuccess]);
  
  // Only simulate for proposals that could still be executed
  const shouldSkipSimulation = proposal ? SKIP_SIMULATION_STATUSES.includes(proposal.status) : false;
  const simulation = useSimulation(shouldSkipSimulation ? undefined : proposal?.actions);

  // Combine votes and feedback into one sorted activity feed
  // Must be called before any early returns to maintain hook order
  const activity = useMemo(() => {
    if (!proposal) return [];
    
    const items: Array<{
      id: string;
      type: 'vote' | 'feedback';
      address: string;
      support: number;
      votes: string;
      reason: string | null;
      timestamp: string;
    }> = [];

    // Add votes
    for (const v of proposal.votes || []) {
      items.push({
        id: `vote-${v.id}`,
        type: 'vote',
        address: v.voter,
        support: v.support,
        votes: v.votes,
        reason: v.reason,
        timestamp: v.blockTimestamp,
      });
    }

    // Add feedback
    for (const f of proposal.feedback || []) {
      items.push({
        id: `feedback-${f.id}`,
        type: 'feedback',
        address: f.voter,
        support: f.support,
        votes: f.votes,
        reason: f.reason,
        timestamp: f.createdTimestamp,
      });
    }

    // Sort by timestamp descending (newest first)
    items.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

    return items;
  }, [proposal]);

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
        <p>Loading proposal...</p>
      </div>
    );
  }

  const forVotes = Number(proposal.forVotes);
  const againstVotes = Number(proposal.againstVotes);
  const abstainVotes = Number(proposal.abstainVotes);
  const quorum = Number(proposal.quorumVotes) || 1;

  // Calculate scale: the max extent we need to show
  // Left side is max of forVotes or quorum (to show gap if needed)
  const leftExtent = Math.max(forVotes, quorum);
  const rightExtent = abstainVotes + againstVotes;
  const totalScale = leftExtent + rightExtent;

  // Calculate widths as percentages of total scale
  const forWidth = totalScale > 0 ? (forVotes / totalScale) * 100 : 0;
  const quorumPosition = totalScale > 0 ? (quorum / totalScale) * 100 : 50;
  const abstainWidth = totalScale > 0 ? (abstainVotes / totalScale) * 100 : 0;
  const againstWidth = totalScale > 0 ? (againstVotes / totalScale) * 100 : 0;
  
  // Gap between For and quorum marker (only if For < quorum)
  const gapWidth = forVotes < quorum ? quorumPosition - forWidth : 0;
  const quorumMet = forVotes >= quorum;

  // Note: isActive is already declared above in the hooks section

  return (
    <div className={styles.container}>
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
      
      {/* Proposal metadata: date, proposer, sponsors */}
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

      {/* Two-column layout on desktop */}
      <div className={styles.columns}>
        {/* Left Column: Description */}
        <div className={styles.leftColumn}>
          {/* Transaction Summary */}
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
        </div>

        {/* Right Column: Simulation, Votes, Actions */}
        <div className={styles.rightColumn}>
          {/* User's Vote Status */}
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
          
          {/* Time Remaining */}
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
          
          {/* Proposer Actions - Show for proposal owner */}
          {proposal && proposalActions.isProposer(proposal, address) && (
            <div className={styles.proposerActions}>
              <span className={styles.proposerActionsLabel}>Proposer</span>
              
              {/* Success/Error Messages */}
              {proposerActionSuccess && (
                <div className={styles.successMessage}>{proposerActionSuccess}</div>
              )}
              {proposerActionError && (
                <div className={styles.errorMessage}>{proposerActionError}</div>
              )}
              
              {/* Edit - during updateable period */}
              {proposalActions.canUpdate(proposal, address) && (
                <button
                  className={styles.editButton}
                  onClick={handleEditProposal}
                  disabled={proposalActions.isPending || proposalActions.isConfirming}
                >
                  Edit Proposal
                </button>
              )}
              
              {/* Queue - after succeeded */}
              {proposalActions.canQueue(proposal) && (
                <button
                  className={styles.queueButton}
                  onClick={handleQueueProposal}
                  disabled={proposalActions.isPending || proposalActions.isConfirming}
                >
                  {proposalActions.isPending || proposalActions.isConfirming ? 'Queueing...' : 'Queue Proposal'}
                </button>
              )}
              
              {/* Execute - after queued and ETA passed */}
              {proposalActions.canExecute(proposal) && (
                <button
                  className={styles.executeButton}
                  onClick={handleExecuteProposal}
                  disabled={proposalActions.isPending || proposalActions.isConfirming}
                >
                  {proposalActions.isPending || proposalActions.isConfirming ? 'Executing...' : 'Execute Proposal'}
                </button>
              )}
              
              {/* Cancel - while pending/active/updatable */}
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
          )}
          
          {/* Simulation Status / Transaction List */}
          <SimulationStatus
            result={simulation.result}
            isLoading={simulation.isLoading}
            error={simulation.error}
            hasActions={simulation.hasActions}
            actions={proposal.actions}
            skipSimulation={shouldSkipSimulation}
          />

          {/* Vote Counts */}
          <div className={styles.voteSection}>
            {/* Vote labels row */}
            <div className={styles.voteLabelsRow}>
              <span className={styles.forLabel}>For {forVotes}</span>
              <span className={styles.rightLabels}>
                {abstainVotes > 0 && (
                  <span className={styles.abstainLabel}>Abstain {abstainVotes}</span>
                )}
                {abstainVotes > 0 && againstVotes > 0 && <span className={styles.labelSeparator}>·</span>}
                {againstVotes > 0 && (
                  <span className={styles.againstLabel}>Against {againstVotes}</span>
                )}
              </span>
            </div>

            {/* Vote bar with individual blocks */}
            <div className={styles.voteBarContainer}>
              {/* For votes (left aligned) - each voter is a block */}
              <div 
                className={styles.forSection}
                style={{ width: `${forWidth}%` }}
              >
                {(proposal.votes || [])
                  .filter((v: { support: number }) => v.support === 1)
                  .sort((a: { votes: string }, b: { votes: string }) => Number(b.votes) - Number(a.votes))
                  .map((v: { id: string; votes: string }) => (
                    <div 
                      key={`for-${v.id}`}
                      className={styles.voteBlock}
                      style={{ 
                        flex: Number(v.votes),
                        backgroundColor: '#43a047',
                      }}
                    />
                  ))}
              </div>
              
              {/* Gap to quorum (only if For < quorum) */}
              {gapWidth > 0 && (
                <div 
                  className={styles.quorumSpace} 
                  style={{ width: `${gapWidth}%` }}
                />
              )}

              {/* Quorum marker - absolutely positioned */}
              <div 
                className={styles.quorumMarker} 
                style={{ left: `${quorumPosition}%` }}
              />

              {/* Abstain votes (gray) */}
              {abstainVotes > 0 && (
                <div 
                  className={styles.abstainSection}
                  style={{ width: `${abstainWidth}%` }}
                >
                  {(proposal.votes || [])
                    .filter((v: { support: number }) => v.support === 2)
                    .map((v: { id: string; votes: string }) => (
                      <div 
                        key={`abstain-${v.id}`}
                        className={styles.voteBlock}
                        style={{ 
                          flex: Number(v.votes),
                          backgroundColor: '#757575',
                        }}
                      />
                    ))}
                </div>
              )}

              {/* Against votes (red) */}
              {againstVotes > 0 && (
                <div 
                  className={styles.againstSection}
                  style={{ width: `${againstWidth}%` }}
                >
                  {(proposal.votes || [])
                    .filter((v: { support: number }) => v.support === 0)
                    .sort((a: { votes: string }, b: { votes: string }) => Number(b.votes) - Number(a.votes))
                    .map((v: { id: string; votes: string }) => (
                      <div 
                        key={`against-${v.id}`}
                        className={styles.voteBlock}
                        style={{ 
                          flex: Number(v.votes),
                          backgroundColor: '#e53935',
                        }}
                      />
                    ))}
                </div>
              )}
            </div>

            {/* Quorum row */}
            <div className={styles.quorumRow}>
              <span className={styles.quorumLabel}>
                Quorum {quorum} {quorumMet ? '(met)' : ''}
              </span>
            </div>
          </div>

          {/* Vote/Comment Actions - Unified UI */}
          {isConnected && hasVotingPower && (
            <div className={styles.actionBox}>
              {/* Header with mode selector */}
              <div className={styles.actionHeader}>
                <span className={styles.actionLabel}>
                  {actionMode === 'vote' ? 'Cast vote' : 'Comment onchain'}
                </span>
                
                {/* Mode dropdown - only show if user can vote */}
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
              
              {/* Info text for comment mode */}
              {actionMode === 'comment' && (
                <p className={styles.actionDescription}>
                  {hasAlreadyVoted 
                    ? 'You have already voted. Add a comment to share additional thoughts.'
                    : !isActive 
                      ? <>Voting is not active.<br />Leave a comment to share your position.</>
                      : 'Comments are non-binding feedback visible onchain.'}
                </p>
              )}
              
              {/* Gas refund note for voting */}
              {actionMode === 'vote' && (
                <p className={styles.actionDescription}>
                  Gas spent on voting will be refunded.
                </p>
              )}
              
              {/* Transaction Status */}
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
          )}

          {/* Activity (Votes + Feedback combined) */}
          {activity.length > 0 && (
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
                    isFeedback={item.type === 'feedback'}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

