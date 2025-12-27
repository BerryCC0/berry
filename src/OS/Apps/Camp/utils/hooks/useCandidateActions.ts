/**
 * useCandidateActions Hook
 * React hook for candidate management actions
 * 
 * Provides:
 * - Update candidate content
 * - Cancel candidate
 * - Send candidate feedback
 */

'use client';

import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { NOUNS_ADDRESSES, NounsDAODataABI } from '@/app/lib/nouns';
import type { Address } from 'viem';

interface CandidateContent {
  targets: Address[];
  values: bigint[];
  signatures: string[];
  calldatas: `0x${string}`[];
  description: string;
  proposalIdToUpdate: bigint;
}

export function useCandidateActions() {
  // Write contract setup
  const { 
    writeContractAsync, 
    data: hash, 
    isPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();
  
  // Transaction confirmation
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({ hash });
  
  // Read costs
  const { data: createCandidateCost } = useReadContract({
    address: NOUNS_ADDRESSES.data as `0x${string}`,
    abi: NounsDAODataABI,
    functionName: 'createCandidateCost',
  });
  
  const { data: updateCandidateCost } = useReadContract({
    address: NOUNS_ADDRESSES.data as `0x${string}`,
    abi: NounsDAODataABI,
    functionName: 'updateCandidateCost',
  });

  /**
   * Create a new proposal candidate
   */
  const createCandidate = async (
    slug: string,
    content: CandidateContent,
    value?: bigint
  ) => {
    try {
      return await writeContractAsync({
        address: NOUNS_ADDRESSES.data as `0x${string}`,
        abi: NounsDAODataABI,
        functionName: 'createProposalCandidate',
        args: [
          content.targets,
          content.values,
          content.signatures,
          content.calldatas,
          content.description,
          slug,
          content.proposalIdToUpdate,
        ],
        value: value || createCandidateCost || BigInt(0),
      });
    } catch (err) {
      console.error('Failed to create candidate:', err);
      throw err;
    }
  };

  /**
   * Update an existing candidate's content
   */
  const updateCandidate = async (
    slug: string,
    content: CandidateContent,
    reason?: string,
    value?: bigint
  ) => {
    try {
      return await writeContractAsync({
        address: NOUNS_ADDRESSES.data as `0x${string}`,
        abi: NounsDAODataABI,
        functionName: 'updateProposalCandidate',
        args: [
          content.targets,
          content.values,
          content.signatures,
          content.calldatas,
          content.description,
          slug,
          content.proposalIdToUpdate,
          reason || '',
        ],
        value: value || updateCandidateCost || BigInt(0),
      });
    } catch (err) {
      console.error('Failed to update candidate:', err);
      throw err;
    }
  };

  /**
   * Cancel a candidate
   */
  const cancelCandidate = async (slug: string) => {
    try {
      return await writeContractAsync({
        address: NOUNS_ADDRESSES.data as `0x${string}`,
        abi: NounsDAODataABI,
        functionName: 'cancelProposalCandidate',
        args: [slug],
      });
    } catch (err) {
      console.error('Failed to cancel candidate:', err);
      throw err;
    }
  };

  /**
   * Send feedback on a candidate
   */
  const sendFeedback = async (
    proposer: string,
    slug: string,
    support: number,
    reason?: string
  ) => {
    try {
      return await writeContractAsync({
        address: NOUNS_ADDRESSES.data as `0x${string}`,
        abi: NounsDAODataABI,
        functionName: 'sendCandidateFeedback',
        args: [proposer as Address, slug, support, reason || ''],
      });
    } catch (err) {
      console.error('Failed to send feedback:', err);
      throw err;
    }
  };

  return {
    // Costs
    createCandidateCost,
    updateCandidateCost,
    
    // Actions
    createCandidate,
    updateCandidate,
    cancelCandidate,
    sendFeedback,
    
    // Status
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error: writeError,
    
    // Utils
    resetWrite,
  };
}

export type { CandidateContent };
