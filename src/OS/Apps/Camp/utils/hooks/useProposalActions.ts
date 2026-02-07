/**
 * useProposalActions Hook
 * React hook for proposal management actions
 * 
 * Provides:
 * - Cancel proposal
 * - Queue proposal (after succeeded)
 * - Execute proposal (after queued and ETA passed)
 * - Update proposal (during updateable period)
 */

'use client';

import { useWriteContract, useWaitForTransactionReceipt, useBlockNumber } from 'wagmi';
import { NOUNS_CONTRACTS } from '@/app/lib/nouns/contracts';
import type { Proposal } from '../../types';

export function useProposalActions() {
  const { 
    writeContractAsync, 
    data: hash, 
    isPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();
  
  const { 
    isLoading: isConfirming, 
    isSuccess,
    error: confirmError,
  } = useWaitForTransactionReceipt({ hash });
  
  // Get current block for status checks
  const { data: currentBlockNumber } = useBlockNumber({ watch: true });

  /**
   * Cancel a proposal
   * Can only be done by the proposer if proposal is still pending/active/updatable
   */
  const cancelProposal = async (proposalId: string) => {
    try {
      return await writeContractAsync({
        address: NOUNS_CONTRACTS.governor.address,
        abi: NOUNS_CONTRACTS.governor.abi,
        functionName: 'cancel',
        args: [BigInt(proposalId)],
      });
    } catch (err) {
      console.error('Failed to cancel proposal:', err);
      throw err;
    }
  };

  /**
   * Queue a proposal for execution
   * Can only be done after proposal has succeeded
   */
  const queueProposal = async (proposalId: string) => {
    try {
      return await writeContractAsync({
        address: NOUNS_CONTRACTS.governor.address,
        abi: NOUNS_CONTRACTS.governor.abi,
        functionName: 'queue',
        args: [BigInt(proposalId)],
      });
    } catch (err) {
      console.error('Failed to queue proposal:', err);
      throw err;
    }
  };

  /**
   * Execute a queued proposal
   * Can only be done after the timelock delay has passed
   */
  const executeProposal = async (proposalId: string) => {
    try {
      return await writeContractAsync({
        address: NOUNS_CONTRACTS.governor.address,
        abi: NOUNS_CONTRACTS.governor.abi,
        functionName: 'execute',
        args: [BigInt(proposalId)],
      });
    } catch (err) {
      console.error('Failed to execute proposal:', err);
      throw err;
    }
  };

  // Note: updateProposalDescription is available in NounsDAOLogicV3 but requires
  // the full ABI. For now, proposal editing during the updateable period will
  // navigate to the CreateProposalView which can handle the full update flow.

  /**
   * Check if a proposal can be canceled by the proposer
   */
  const canCancel = (proposal: Proposal, userAddress?: string): boolean => {
    if (!userAddress) return false;
    const isProposer = proposal.proposer.toLowerCase() === userAddress.toLowerCase();
    if (!isProposer) return false;
    
    // Can cancel if still in pending, active, or updatable state
    const cancelableStatuses = ['PENDING', 'ACTIVE', 'UPDATABLE', 'OBJECTION_PERIOD'];
    return cancelableStatuses.includes(proposal.status);
  };

  /**
   * Check if a proposal can be queued
   */
  const canQueue = (proposal: Proposal): boolean => {
    return proposal.status === 'SUCCEEDED';
  };

  /**
   * Check if a proposal can be executed
   * Needs to be queued and past the ETA
   */
  const canExecute = (proposal: Proposal): boolean => {
    if (proposal.status !== 'QUEUED') return false;
    
    // Check if ETA has passed (ETA is in seconds)
    // Support both eta and executionETA field names
    const eta = proposal.eta || proposal.executionETA;
    if (!eta) return false;
    const now = Math.floor(Date.now() / 1000);
    return now >= Number(eta);
  };

  /**
   * Check if a proposal can be updated
   * Only during the updateable period before voting starts
   */
  const canUpdate = (proposal: Proposal, userAddress?: string): boolean => {
    if (!userAddress) return false;
    const isProposer = proposal.proposer.toLowerCase() === userAddress.toLowerCase();
    if (!isProposer) return false;
    
    // Check if in updateable status
    if (proposal.status !== 'UPDATABLE') {
      // Also check updatePeriodEndBlock if we have current block
      if (currentBlockNumber && proposal.updatePeriodEndBlock) {
        return Number(currentBlockNumber) < Number(proposal.updatePeriodEndBlock);
      }
      return false;
    }
    
    return true;
  };

  /**
   * Check if the user is the proposer
   */
  const isProposer = (proposal: Proposal, userAddress?: string): boolean => {
    if (!userAddress) return false;
    return proposal.proposer.toLowerCase() === userAddress.toLowerCase();
  };

  return {
    // Actions
    cancelProposal,
    queueProposal,
    executeProposal,
    
    // Permission checks
    canCancel,
    canQueue,
    canExecute,
    canUpdate,
    isProposer,
    
    // Transaction state
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError || confirmError,
    reset: resetWrite,
  };
}
