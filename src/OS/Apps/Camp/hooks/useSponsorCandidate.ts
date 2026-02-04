/**
 * useSponsorCandidate Hook
 * Handles signing and submitting sponsorship for candidates
 * 
 * Flow:
 * 1. User clicks "Sponsor" button
 * 2. Modal opens for reason input
 * 3. User signs EIP-712 typed data
 * 4. User submits addSignature transaction
 */

'use client';

import { useState, useCallback } from 'react';
import { useAccount, useSignTypedData, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { NOUNS_ADDRESSES, NounsDAODataABI, NounsTokenABI } from '@/app/lib/nouns/contracts';
import { encodeAbiParameters, parseAbiParameters } from 'viem';
import type { Address } from 'viem';

interface CandidateData {
  proposer: string;
  slug: string;
  proposalIdToUpdate?: string;
  description: string;
  actions: {
    target: string;
    value: string;
    signature: string;
    calldata: string;
  }[];
}

interface UseSponsorCandidateReturn {
  // State
  hasVotingPower: boolean;
  isLoading: boolean;
  isSigning: boolean;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
  
  // Actions
  sponsorCandidate: (candidate: CandidateData, reason: string, expirationDays?: number) => Promise<void>;
  reset: () => void;
}

// Domain for EIP-712 signature - Nouns DAO Data contract
const NOUNS_DAO_DATA_DOMAIN = {
  name: 'Nouns DAO',
  chainId: 1,
  verifyingContract: NOUNS_ADDRESSES.data as `0x${string}`,
};

// EIP-712 types for proposal signature
const PROPOSAL_TYPES = {
  Proposal: [
    { name: 'proposer', type: 'address' },
    { name: 'targets', type: 'address[]' },
    { name: 'values', type: 'uint256[]' },
    { name: 'signatures', type: 'string[]' },
    { name: 'calldatas', type: 'bytes[]' },
    { name: 'description', type: 'string' },
    { name: 'expirationTimestamp', type: 'uint256' },
  ],
} as const;

export function useSponsorCandidate(): UseSponsorCandidateReturn {
  const { address, isConnected } = useAccount();
  
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [signedData, setSignedData] = useState<{
    signature: `0x${string}`;
    expirationTimestamp: bigint;
    encodedProp: `0x${string}`;
    candidate: CandidateData;
    reason: string;
  } | null>(null);
  
  // Check if user has voting power
  const { data: votingPower } = useReadContract({
    address: NOUNS_ADDRESSES.token as `0x${string}`,
    abi: NounsTokenABI,
    functionName: 'getCurrentVotes',
    args: address ? [address] : undefined,
  });
  
  const hasVotingPower = !!votingPower && votingPower > BigInt(0);
  
  // Sign typed data
  const { 
    signTypedDataAsync,
    isPending: isSignPending,
  } = useSignTypedData();
  
  // Write contract for addSignature
  const {
    writeContractAsync,
    data: hash,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();
  
  // Transaction confirmation
  const {
    isLoading: isConfirming,
    isSuccess,
  } = useWaitForTransactionReceipt({ hash });
  
  /**
   * Encode proposal data for the signature
   * This must match what the contract expects
   */
  const encodeProposalData = useCallback((
    proposer: Address,
    targets: Address[],
    values: bigint[],
    signatures: string[],
    calldatas: `0x${string}`[],
    description: string
  ): `0x${string}` => {
    // Encode the proposal data as the contract expects
    // This is the keccak256 hash of the packed encoding
    const encoded = encodeAbiParameters(
      parseAbiParameters('address, address[], uint256[], string[], bytes[], string'),
      [proposer, targets, values, signatures, calldatas, description]
    );
    return encoded;
  }, []);
  
  /**
   * Sponsor a candidate
   */
  const sponsorCandidate = useCallback(async (
    candidate: CandidateData,
    reason: string,
    expirationDays: number = 14
  ) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }
    
    if (!hasVotingPower) {
      throw new Error('No voting power');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Prepare proposal data
      const proposer = candidate.proposer as Address;
      const targets = candidate.actions.map(a => a.target as Address);
      const values = candidate.actions.map(a => BigInt(a.value || '0'));
      const signatures = candidate.actions.map(a => a.signature || '');
      const calldatas = candidate.actions.map(a => {
        const data = a.calldata || '';
        return (data.startsWith('0x') ? data : `0x${data}`) as `0x${string}`;
      });
      const description = candidate.description;
      
      // Calculate expiration timestamp (default 14 days from now)
      const expirationTimestamp = BigInt(Math.floor(Date.now() / 1000) + (expirationDays * 24 * 60 * 60));
      
      // Encode proposal data for the encodedProp parameter
      const encodedProp = encodeProposalData(proposer, targets, values, signatures, calldatas, description);
      
      // Step 1: Sign EIP-712 typed data
      setIsSigning(true);
      
      const signature = await signTypedDataAsync({
        domain: NOUNS_DAO_DATA_DOMAIN,
        types: PROPOSAL_TYPES,
        primaryType: 'Proposal',
        message: {
          proposer,
          targets,
          values,
          signatures,
          calldatas,
          description,
          expirationTimestamp,
        },
      });
      
      setIsSigning(false);
      
      // Store signed data for the transaction
      setSignedData({
        signature,
        expirationTimestamp,
        encodedProp,
        candidate,
        reason,
      });
      
      // Step 2: Submit addSignature transaction
      await writeContractAsync({
        address: NOUNS_ADDRESSES.data as `0x${string}`,
        abi: NounsDAODataABI,
        functionName: 'addSignature',
        args: [
          signature,
          expirationTimestamp,
          proposer,
          candidate.slug,
          BigInt(candidate.proposalIdToUpdate || '0'),
          encodedProp,
          reason,
        ],
      });
      
      setIsLoading(false);
      
    } catch (err) {
      setIsSigning(false);
      setIsLoading(false);
      const error = err instanceof Error ? err : new Error('Failed to sponsor candidate');
      setError(error);
      throw error;
    }
  }, [isConnected, address, hasVotingPower, signTypedDataAsync, writeContractAsync, encodeProposalData]);
  
  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setIsLoading(false);
    setIsSigning(false);
    setError(null);
    setSignedData(null);
    resetWrite();
  }, [resetWrite]);
  
  return {
    hasVotingPower,
    isLoading,
    isSigning: isSigning || isSignPending,
    isPending: isWritePending,
    isConfirming,
    isSuccess,
    error: error || writeError || null,
    sponsorCandidate,
    reset,
  };
}
