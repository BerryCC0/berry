/**
 * useCandidateDetail
 * Business logic hook for the CandidateDetailView
 * Handles sponsorship, promotion, signals, and candidate lifecycle
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useEnsName, useReadContract } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { useCandidate } from './useCandidates';
import { useSignal } from './index';
import { useSimulation } from './useSimulation';
import { usePromoteCandidate } from './usePromoteCandidate';
import { useCandidateActions } from '../utils/hooks/useCandidateActions';
import { NOUNS_CONTRACTS } from '@/app/lib/nouns/contracts';

export function useCandidateDetail(
  proposer: string,
  slug: string,
  onNavigate: (path: string) => void,
) {
  const { address, isConnected } = useAccount();
  const { data: candidate, isLoading, error, refetch } = useCandidate(proposer, slug);
  
  // Use actual proposer from candidate data (handles clean URLs where proposer prop is empty)
  const actualProposer = candidate?.proposer || proposer;
  
  const { data: ensName } = useEnsName({
    address: actualProposer as `0x${string}`,
    chainId: mainnet.id,
    query: {
      enabled: !!actualProposer,
    },
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
    args: actualProposer ? [actualProposer as `0x${string}`] : undefined,
    query: {
      enabled: !!actualProposer,
    },
  });

  const {
    sendCandidateSignal,
    isPending: signalPending,
    isConfirming: signalConfirming,
    isSuccess: signalSuccess,
    hasVotingPower,
    reset: resetSignal,
  } = useSignal(address);

  // UI state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [signalReason, setSignalReason] = useState('');
  const [showSignalSuccess, setShowSignalSuccess] = useState(false);
  const [totalSponsorVotes, setTotalSponsorVotes] = useState(0);

  // Clear reason and show success message when signal transaction is confirmed
  useEffect(() => {
    if (signalSuccess) {
      setSignalReason('');
      setShowSignalSuccess(true);
      resetSignal();
      refetch();
      const timer = setTimeout(() => setShowSignalSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [signalSuccess, resetSignal, refetch]);

  const handleSignal = useCallback(async (support: 0 | 1 | 2) => {
    try {
      await sendCandidateSignal(actualProposer, slug, support, signalReason);
    } catch (err) {
      console.error('Failed to send signal:', err);
    }
  }, [sendCandidateSignal, actualProposer, slug, signalReason]);
  
  // Automatic simulation
  const simulation = useSimulation(candidate?.actions);

  const proposerDisplay = ensName || (actualProposer ? `${actualProposer.slice(0, 6)}...${actualProposer.slice(-4)}` : '...');
  
  // Check if connected user is the candidate owner
  const isOwner = isConnected && !!actualProposer && address?.toLowerCase() === actualProposer.toLowerCase();
  const isCanceled = candidate?.canceled === true;

  // Calculate voting power for promotion eligibility
  const signatureCount = candidate?.signatures?.length || 0;
  const threshold = proposalThreshold ? Number(proposalThreshold) : 0;
  const proposerVotes = proposerVotingPower ? Number(proposerVotingPower) : 0;
  const requiredNouns = threshold + 1;
  const totalVotingPower = proposerVotes + totalSponsorVotes;
  const hasEnoughVotingPower = totalVotingPower >= requiredNouns;
  const canPromote = isOwner && !isCanceled && hasEnoughVotingPower;

  const handleEdit = useCallback(() => {
    onNavigate(`create/edit/${actualProposer}/${slug}`);
  }, [onNavigate, actualProposer, slug]);

  const handleCancelClick = useCallback(() => {
    setShowCancelConfirm(true);
  }, []);

  const handleConfirmCancel = useCallback(async () => {
    setCancelError(null);
    try {
      await cancelCandidate(slug);
      setCancelSuccess(true);
      setShowCancelConfirm(false);
      setTimeout(() => refetch(), 2000);
    } catch (err) {
      if (err instanceof Error) {
        setCancelError(err.message.includes('user rejected') ? 'Transaction was rejected' : err.message);
      } else {
        setCancelError('Failed to cancel candidate');
      }
    }
  }, [cancelCandidate, slug, refetch]);

  const handlePromoteClick = useCallback(() => {
    setShowPromoteConfirm(true);
  }, []);

  const handleConfirmPromote = useCallback(async () => {
    if (!candidate) return;
    await promoteCandidate(candidate);
  }, [candidate, promoteCandidate]);

  // Derived display values
  const title = candidate ? (candidate.title || candidate.slug.replace(/-/g, ' ')) : '';
  const createdDate = candidate ? new Date(Number(candidate.createdTimestamp) * 1000) : null;

  return {
    // Data
    candidate,
    isLoading,
    error,
    simulation,
    actualProposer,
    
    // Display values
    title,
    createdDate,
    proposerDisplay,
    
    // User state
    isConnected,
    address,
    hasVotingPower,
    isOwner,
    isCanceled,
    
    // Promotion
    canPromote,
    signatureCount,
    threshold,
    totalSponsorVotes,
    setTotalSponsorVotes,
    isPromoting,
    promoteSuccess,
    promoteIsError,
    promoteError,
    promotedProposalId,
    showPromoteConfirm,
    setShowPromoteConfirm,
    handlePromoteClick,
    handleConfirmPromote,
    resetPromote,
    
    // Cancel
    isPending,
    isConfirming,
    showCancelConfirm,
    setShowCancelConfirm,
    cancelSuccess,
    cancelError,
    handleCancelClick,
    handleConfirmCancel,
    
    // Edit
    handleEdit,
    
    // Signals (feedback)
    signalReason,
    setSignalReason,
    signalPending,
    signalConfirming,
    showSignalSuccess,
    handleSignal,
    
    // Refetch
    refetch,
    
    // Navigation
    onNavigate,
  };
}
