/**
 * useCandidateDetail
 * Business logic hook for the CandidateDetailView
 * Handles sponsorship, promotion, signals, and candidate lifecycle
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { useCandidate } from './useCandidates';
import { useEnsName } from '@/OS/hooks/useEnsData';
import { useSignal } from './index';
import { useSimulation } from './useSimulation';
import { usePromoteCandidate } from './usePromoteCandidate';
import { useSponsorActiveProposals } from './useSponsorActiveProposals';
import { useCandidateActions } from '../utils/hooks/useCandidateActions';
import { NOUNS_CONTRACTS } from '@/app/lib/nouns/contracts';
import type { CandidateSignature } from '../types';

export function useCandidateDetail(
  proposer: string,
  slug: string,
  onNavigate: (path: string) => void,
) {
  const { address, isConnected } = useAccount();
  const { data: candidate, isLoading, error, refetch } = useCandidate(proposer, slug);
  
  // Use actual proposer from candidate data (handles clean URLs where proposer prop is empty)
  const actualProposer = candidate?.proposer || proposer;

  const ensName = useEnsName(actualProposer || undefined);
  
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
  const [selectedSignatureIds, setSelectedSignatureIds] = useState<string[] | null>(null);

  // Compute the set of signatures that would be usable for promotion — fresh
  // (matching encodedPropHash), not expired, deduped by signer (latest wins).
  // This is the same filter applied in usePromoteCandidate; exposing it here
  // lets the UI render a checklist with per-row warnings.
  const promotableSignatures = useMemo<CandidateSignature[]>(() => {
    if (!candidate?.signatures) return [];
    const currentHash = candidate.encodedProposalHash?.toLowerCase() || '';
    const now = Math.floor(Date.now() / 1000);
    const fresh = candidate.signatures.filter((sig) => {
      if (Number(sig.expirationTimestamp) <= now) return false;
      if (!currentHash || !sig.encodedPropHash) return true;
      return sig.encodedPropHash.toLowerCase() === currentHash;
    });
    const latestBySigner = new Map<string, CandidateSignature>();
    for (const sig of fresh) {
      const key = sig.signer.toLowerCase();
      const existing = latestBySigner.get(key);
      if (!existing || Number(sig.createdTimestamp) > Number(existing.createdTimestamp)) {
        latestBySigner.set(key, sig);
      }
    }
    return Array.from(latestBySigner.values());
  }, [candidate?.signatures, candidate?.encodedProposalHash]);

  // Pre-flight check: which sponsors currently have a live proposal of their
  // own. Those signatures would cause `proposeBySigs` to revert via the
  // on-chain `checkNoActiveProp`, so they're auto-excluded from the default
  // selection.
  const promotableSigners = useMemo(
    () => promotableSignatures.map((s) => s.signer),
    [promotableSignatures]
  );
  const { conflictsBySigner, isLoading: isLoadingConflicts } =
    useSponsorActiveProposals(promotableSigners);

  // Default selection: every promotable sig whose signer doesn't have an
  // active proposal conflict. Recomputes only when the promotable set or
  // conflict map changes. `selectedSignatureIds === null` means "use the
  // default"; once the user toggles anything, we pin the explicit list.
  const effectiveSelectedIds = useMemo(() => {
    if (selectedSignatureIds !== null) return selectedSignatureIds;
    return promotableSignatures
      .filter((s) => !conflictsBySigner.has(s.signer.toLowerCase()))
      .map((s) => s.id);
  }, [selectedSignatureIds, promotableSignatures, conflictsBySigner]);

  const toggleSignature = useCallback((sigId: string) => {
    setSelectedSignatureIds((prev) => {
      // Materialize the default into explicit state before toggling.
      const base =
        prev ??
        promotableSignatures
          .filter((s) => !conflictsBySigner.has(s.signer.toLowerCase()))
          .map((s) => s.id);
      return base.includes(sigId)
        ? base.filter((id) => id !== sigId)
        : [...base, sigId];
    });
  }, [promotableSignatures, conflictsBySigner]);

  // Per-signer voting power for the promotable set so the confirm dialog
  // can show a live "selected / required" threshold as the user toggles.
  const { data: perSignerVotes } = useReadContracts({
    contracts: promotableSignatures.map((sig) => ({
      address: NOUNS_CONTRACTS.token.address,
      abi: NOUNS_CONTRACTS.token.abi,
      functionName: 'getCurrentVotes',
      args: [sig.signer as `0x${string}`],
    })),
    query: { enabled: promotableSignatures.length > 0 },
  });

  const votesBySignature = useMemo(() => {
    const map = new Map<string, number>();
    if (!perSignerVotes) return map;
    promotableSignatures.forEach((sig, i) => {
      const result = perSignerVotes[i];
      if (result?.status === 'success') {
        map.set(sig.id, Number(result.result));
      }
    });
    return map;
  }, [perSignerVotes, promotableSignatures]);

  const selectedSponsorVotes = useMemo(() => {
    return effectiveSelectedIds.reduce(
      (sum, id) => sum + (votesBySignature.get(id) || 0),
      0
    );
  }, [effectiveSelectedIds, votesBySignature]);

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
    await promoteCandidate(candidate, effectiveSelectedIds);
  }, [candidate, promoteCandidate, effectiveSelectedIds]);

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
    proposerVotes,
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
    // Promotion — sponsor selection
    promotableSignatures,
    effectiveSelectedIds,
    toggleSignature,
    conflictsBySigner,
    isLoadingConflicts,
    votesBySignature,
    selectedSponsorVotes,
    
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
