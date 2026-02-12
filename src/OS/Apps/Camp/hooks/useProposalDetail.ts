/**
 * useProposalDetail
 * Business logic hook for the ProposalDetailView
 * Handles voting, commenting, proposer actions, time tracking, and activity feed
 */

'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAccount, useReadContract, useBlockNumber } from 'wagmi';
import { useProposal, useSignal } from './index';
import { useSimulation } from './useSimulation';
import { useProposalActions } from '../utils/hooks/useProposalActions';
import { useVote } from '@/app/lib/nouns/hooks';
import { NOUNS_CONTRACTS } from '@/app/lib/nouns/contracts';
import { formatTimeRemaining } from '../utils/descriptionUtils';

// Statuses where simulation doesn't make sense (already finalized)
const SKIP_SIMULATION_STATUSES = ['EXECUTED', 'DEFEATED', 'VETOED', 'CANCELLED', 'EXPIRED'];

export type ActionMode = 'vote' | 'comment';

export interface ActivityItem {
  id: string;
  type: 'vote' | 'feedback';
  address: string;
  support: number;
  votes: string;
  reason: string | null;
  timestamp: string;
  clientId?: number;
}

export interface TimeRemaining {
  type: 'pending' | 'active' | 'ended';
  seconds: number;
}

export function useProposalDetail(proposalId: string, onNavigate: (path: string) => void) {
  const { isConnected, address } = useAccount();
  const { data: proposal, isLoading, error, refetch } = useProposal(proposalId);
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
  const timeRemaining = useMemo<TimeRemaining | null>(() => {
    if (!blockNumber || !proposal?.startBlock || !proposal?.endBlock) return null;
    
    const currentBlock = Number(blockNumber);
    const startBlock = Number(proposal.startBlock);
    const endBlock = Number(proposal.endBlock);
    const SECONDS_PER_BLOCK = 12;
    
    if (currentBlock < startBlock) {
      const blocksUntilStart = startBlock - currentBlock;
      const secondsUntilStart = blocksUntilStart * SECONDS_PER_BLOCK;
      return { type: 'pending' as const, seconds: secondsUntilStart };
    }
    
    if (currentBlock < endBlock) {
      const blocksRemaining = endBlock - currentBlock;
      const secondsRemaining = blocksRemaining * SECONDS_PER_BLOCK;
      return { type: 'active' as const, seconds: secondsRemaining };
    }
    
    return { type: 'ended' as const, seconds: 0 };
  }, [blockNumber, proposal?.startBlock, proposal?.endBlock]);
  
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

  // Clear reason and show success message when vote transaction is confirmed
  useEffect(() => {
    if (isSuccess && hash) {
      setActionReason('');
      setShowSuccess(true);
      refetch();
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, hash, refetch]);

  // Clear reason and show success message when signal transaction is confirmed
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

  // Action handler (vote or comment)
  const handleAction = useCallback(async (support: 0 | 1 | 2) => {
    try {
      if (actionMode === 'vote') {
        voteRefundable(BigInt(proposalId), support, actionReason);
      } else {
        await sendProposalSignal(BigInt(proposalId), support, actionReason);
      }
    } catch (err) {
      console.error('Failed to send action:', err);
    }
  }, [actionMode, proposalId, actionReason, voteRefundable, sendProposalSignal]);
  
  const isActionPending = actionMode === 'vote' ? isPending : signalPending;
  const isActionConfirming = actionMode === 'vote' ? isConfirming : signalConfirming;
  
  // Proposer action handlers
  const handleCancelProposal = useCallback(async () => {
    setProposerActionError(null);
    try {
      await proposalActions.cancelProposal(proposalId);
      setProposerActionSuccess('Proposal cancelled successfully');
      setShowCancelConfirm(false);
      setTimeout(() => refetch(), 2000);
    } catch (err) {
      if (err instanceof Error) {
        setProposerActionError(err.message.includes('user rejected') ? 'Transaction was rejected' : err.message);
      } else {
        setProposerActionError('Failed to cancel proposal');
      }
    }
  }, [proposalActions, proposalId, refetch]);
  
  const handleQueueProposal = useCallback(async () => {
    setProposerActionError(null);
    try {
      await proposalActions.queueProposal(proposalId);
      setProposerActionSuccess('Proposal queued successfully');
      setTimeout(() => refetch(), 2000);
    } catch (err) {
      if (err instanceof Error) {
        setProposerActionError(err.message.includes('user rejected') ? 'Transaction was rejected' : err.message);
      } else {
        setProposerActionError('Failed to queue proposal');
      }
    }
  }, [proposalActions, proposalId, refetch]);
  
  const handleExecuteProposal = useCallback(async () => {
    setProposerActionError(null);
    try {
      await proposalActions.executeProposal(proposalId);
      setProposerActionSuccess('Proposal executed successfully');
      setTimeout(() => refetch(), 2000);
    } catch (err) {
      if (err instanceof Error) {
        setProposerActionError(err.message.includes('user rejected') ? 'Transaction was rejected' : err.message);
      } else {
        setProposerActionError('Failed to execute proposal');
      }
    }
  }, [proposalActions, proposalId, refetch]);
  
  const handleEditProposal = useCallback(() => {
    onNavigate(`create/edit-proposal/${proposalId}`);
  }, [onNavigate, proposalId]);
  
  // Clear proposer action success after a delay
  useEffect(() => {
    if (proposerActionSuccess) {
      const timer = setTimeout(() => setProposerActionSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [proposerActionSuccess]);
  
  // Simulation
  const shouldSkipSimulation = proposal ? SKIP_SIMULATION_STATUSES.includes(proposal.status) : false;
  const simulation = useSimulation(shouldSkipSimulation ? undefined : proposal?.actions);

  // Combine votes and feedback into one sorted activity feed
  const activity = useMemo<ActivityItem[]>(() => {
    if (!proposal) return [];
    
    const items: ActivityItem[] = [];

    for (const v of proposal.votes || []) {
      items.push({
        id: `vote-${v.id}`,
        type: 'vote',
        address: v.voter,
        support: v.support,
        votes: v.votes,
        reason: v.reason,
        timestamp: v.blockTimestamp,
        clientId: v.clientId,
      });
    }

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

    items.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    return items;
  }, [proposal]);

  // Vote count computations
  const voteCounts = useMemo(() => {
    if (!proposal) return null;
    
    const forVotes = Number(proposal.forVotes);
    const againstVotes = Number(proposal.againstVotes);
    const abstainVotes = Number(proposal.abstainVotes);
    const quorum = Number(proposal.quorumVotes) || 1;

    const leftExtent = Math.max(forVotes, quorum);
    const rightExtent = abstainVotes + againstVotes;
    const totalScale = leftExtent + rightExtent;

    const forWidth = totalScale > 0 ? (forVotes / totalScale) * 100 : 0;
    const quorumPosition = totalScale > 0 ? (quorum / totalScale) * 100 : 50;
    const abstainWidth = totalScale > 0 ? (abstainVotes / totalScale) * 100 : 0;
    const againstWidth = totalScale > 0 ? (againstVotes / totalScale) * 100 : 0;
    const gapWidth = forVotes < quorum ? quorumPosition - forWidth : 0;
    const quorumMet = forVotes >= quorum;

    return {
      forVotes,
      againstVotes,
      abstainVotes,
      quorum,
      forWidth,
      quorumPosition,
      abstainWidth,
      againstWidth,
      gapWidth,
      quorumMet,
    };
  }, [proposal]);

  return {
    // Data
    proposal,
    isLoading,
    error,
    activity,
    voteCounts,
    simulation,
    shouldSkipSimulation,
    timeRemaining,
    
    // User state
    isConnected,
    address,
    hasAlreadyVoted,
    userVoteSupport,
    hasVotingPower,
    isActive,
    canVote,
    
    // Action state
    actionReason,
    setActionReason,
    actionMode,
    setActionMode,
    showModeDropdown,
    setShowModeDropdown,
    showSuccess,
    dropdownRef,
    handleAction,
    isActionPending,
    isActionConfirming,
    
    // Proposer actions
    proposalActions,
    showCancelConfirm,
    setShowCancelConfirm,
    proposerActionError,
    proposerActionSuccess,
    handleCancelProposal,
    handleQueueProposal,
    handleExecuteProposal,
    handleEditProposal,
    
    // Utils
    formatTimeRemaining,
  };
}
