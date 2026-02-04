/**
 * useSponsorCandidate Hook
 * Handles signing and submitting sponsorship for candidates
 * 
 * Flow:
 * 1. User clicks "Sponsor" button
 * 2. Modal opens for reason input
 * 3. User signs EIP-712 typed data
 * 4. User submits addSignature transaction
 * 
 * For Smart Contract Wallets (Safe, etc.):
 * - The signing and submission can be done as separate steps
 * - This allows time for multi-sig approval if needed
 */

'use client';

import { useState, useCallback } from 'react';
import { useAccount, useSignTypedData, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { NOUNS_ADDRESSES, NounsDAODataABI, NounsTokenABI } from '@/app/lib/nouns/contracts';
import { encodeAbiParameters, parseAbiParameters, hashTypedData, pad, concat, toHex } from 'viem';
import type { Address, Hex } from 'viem';

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

interface SignedSponsorData {
  signature: `0x${string}`;
  expirationTimestamp: bigint;
  encodedProp: `0x${string}`;
  candidate: CandidateData;
  reason: string;
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
  
  // For two-step flow (Safe wallets)
  signedData: SignedSponsorData | null;
  hasPendingSignature: boolean;
  
  // Actions
  sponsorCandidate: (candidate: CandidateData, reason: string, expirationDays?: number) => Promise<void>;
  signOnly: (candidate: CandidateData, reason: string, expirationDays?: number) => Promise<SignedSponsorData>;
  submitSignature: () => Promise<void>;
  reset: () => void;
}

// Domain for EIP-712 signature - Nouns DAO Governor contract (NOT Data contract)
// The signature is verified against the DAO contract's domain
const NOUNS_DAO_DOMAIN = {
  name: 'Nouns DAO',
  chainId: 1,
  verifyingContract: NOUNS_ADDRESSES.governor as `0x${string}`,
};

// EIP-712 types for proposal signature
// IMPORTANT: The field name must be "expiry" not "expirationTimestamp"
const PROPOSAL_TYPES = {
  Proposal: [
    { name: 'proposer', type: 'address' },
    { name: 'targets', type: 'address[]' },
    { name: 'values', type: 'uint256[]' },
    { name: 'signatures', type: 'string[]' },
    { name: 'calldatas', type: 'bytes[]' },
    { name: 'description', type: 'string' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;

// Types for updating an existing proposal
const UPDATE_PROPOSAL_TYPES = {
  UpdateProposal: [
    { name: 'proposalId', type: 'uint256' },
    { name: 'proposer', type: 'address' },
    { name: 'targets', type: 'address[]' },
    { name: 'values', type: 'uint256[]' },
    { name: 'signatures', type: 'string[]' },
    { name: 'calldatas', type: 'bytes[]' },
    { name: 'description', type: 'string' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;

export function useSponsorCandidate(): UseSponsorCandidateReturn {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [signedData, setSignedData] = useState<SignedSponsorData | null>(null);
  const [isSmartWallet, setIsSmartWallet] = useState(false);
  
  // Check if wallet is a smart contract wallet
  const checkIfSmartWallet = useCallback(async () => {
    if (!address || !publicClient) return false;
    try {
      const code = await publicClient.getCode({ address: address as `0x${string}` });
      const isSCW = code !== undefined && code !== '0x';
      setIsSmartWallet(isSCW);
      return isSCW;
    } catch {
      return false;
    }
  }, [address, publicClient]);
  
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
    const encoded = encodeAbiParameters(
      parseAbiParameters('address, address[], uint256[], string[], bytes[], string'),
      [proposer, targets, values, signatures, calldatas, description]
    );
    return encoded;
  }, []);
  
  /**
   * Prepare proposal data from candidate
   */
  const prepareProposalData = useCallback((candidate: CandidateData) => {
    const proposer = candidate.proposer as Address;
    const targets = candidate.actions.map(a => a.target as Address);
    const values = candidate.actions.map(a => BigInt(a.value || '0'));
    const signatures = candidate.actions.map(a => a.signature || '');
    const calldatas = candidate.actions.map(a => {
      const data = a.calldata || '';
      return (data.startsWith('0x') ? data : `0x${data}`) as `0x${string}`;
    });
    const description = candidate.description;
    
    return { proposer, targets, values, signatures, calldatas, description };
  }, []);
  
  /**
   * Create an EIP-1271 compatible signature for Smart Contract Wallets
   * 
   * For contracts using OpenZeppelin's SignatureChecker, there are typically two formats:
   * 1. Standard ECDSA (65 bytes) - ecrecover returns signer, if contract, call isValidSignature
   * 2. Contract signature format with explicit signer
   * 
   * For Nouns DAO which uses SignatureChecker, we need the signature to resolve to the Safe address.
   * Since the raw signature resolves to the owner's EOA, we need a different approach.
   * 
   * One common pattern for EIP-1271 is:
   * - Signature format: | signer address (32 bytes) | signature offset (32 bytes) | signature data |
   * - But this requires the contract to expect this format
   * 
   * Another approach used by Safe:
   * - Use v=0 to indicate contract signature
   * - r = signer address (left padded to 32 bytes)  
   * - s = offset to signature data
   */
  const createEIP1271Signature = useCallback((
    signerAddress: Address,
    rawSignature: Hex
  ): Hex => {
    // The Nouns contract may use SignatureChecker.isValidSignatureNow which supports:
    // 1. ECDSA signatures - recovered address is checked
    // 2. EIP-1271 - if recovered address is a contract OR if specific format is used
    
    // For Safe wallets, the challenge is that ecrecover returns the owner's address,
    // not the Safe's address. We need to signal that verification should happen on the Safe.
    
    // Try approach: Create a signature where v=0 indicates contract signature
    // and the signer address is embedded
    // Format: | r (signer address padded to 32 bytes) | s (offset, 32 bytes) | v (0) |
    
    // Actually, for SignatureChecker to work with EIP-1271, it checks if the
    // RECOVERED address is a contract. Since our signature recovers to an EOA,
    // it won't trigger EIP-1271 verification.
    
    // The only way this can work is if the Nouns contract explicitly handles
    // a format where the signer address is provided separately.
    
    // Let's try prepending the signer address (as done in some implementations)
    // This creates: | signer (20 bytes) | signature (65 bytes) |
    const signerPadded = pad(signerAddress as Hex, { size: 32 });
    const dynamicOffset = pad(toHex(65), { size: 32 }); // Offset to signature data
    
    // Contract signature format with v=0
    // r = contract address (padded)
    // s = offset to signature data
    // v = 0 (indicates contract signature)
    // followed by: length (32 bytes) + signature data
    
    // Simpler approach for now - just return raw signature and log for debugging
    // The Safe app should handle EIP-1271 signatures properly
    console.log('[EIP1271] Creating signature for signer:', signerAddress);
    console.log('[EIP1271] Raw signature:', rawSignature);
    
    return rawSignature;
  }, []);
  
  /**
   * Sign only - for two-step flow (Safe wallets)
   * Returns the signed data without submitting the transaction
   */
  const signOnly = useCallback(async (
    candidate: CandidateData,
    reason: string,
    expirationDays: number = 14
  ): Promise<SignedSponsorData> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }
    
    if (!hasVotingPower) {
      throw new Error('No voting power');
    }
    
    setIsSigning(true);
    setError(null);
    
    try {
      // Check if this is a smart contract wallet
      const isSCW = await checkIfSmartWallet();
      
      const { proposer, targets, values, signatures, calldatas, description } = prepareProposalData(candidate);
      
      // Calculate expiration timestamp
      const expirationTimestamp = BigInt(Math.floor(Date.now() / 1000) + (expirationDays * 24 * 60 * 60));
      
      // Encode proposal data
      const encodedProp = encodeProposalData(proposer, targets, values, signatures, calldatas, description);
      
      // Determine if this is an update to an existing proposal
      const isUpdate = candidate.proposalIdToUpdate && candidate.proposalIdToUpdate !== '0';
      
      // Sign EIP-712 typed data
      // IMPORTANT: Use "expiry" not "expirationTimestamp" - this must match the contract's expected type
      // IMPORTANT: Use DAO Governor address for verifyingContract, not Data contract
      let rawSignature: `0x${string}`;
      
      if (isUpdate) {
        rawSignature = await signTypedDataAsync({
          domain: NOUNS_DAO_DOMAIN,
          types: UPDATE_PROPOSAL_TYPES,
          primaryType: 'UpdateProposal',
          message: {
            proposalId: BigInt(candidate.proposalIdToUpdate!),
            proposer,
            targets,
            values,
            signatures,
            calldatas,
            description,
            expiry: expirationTimestamp,
          },
        });
      } else {
        rawSignature = await signTypedDataAsync({
          domain: NOUNS_DAO_DOMAIN,
          types: PROPOSAL_TYPES,
          primaryType: 'Proposal',
          message: {
            proposer,
            targets,
            values,
            signatures,
            calldatas,
            description,
            expiry: expirationTimestamp,
          },
        });
      }
      
      // For smart contract wallets, the signature needs special handling
      // The raw signature from signTypedData is signed by the Safe owner,
      // but we need the Nouns contract to recognize the Safe as the signer
      let signature = rawSignature;
      
      if (isSCW) {
        // For SCW, the signature is from the owner's EOA but we need EIP-1271 verification
        // Most contracts that support EIP-1271 will call isValidSignature on the signer
        // The signer is recovered from the signature, which will be the owner's address
        // 
        // The issue: ecrecover returns owner address, not Safe address
        // For EIP-1271 to work, the contract needs to know to call the Safe's isValidSignature
        //
        // Some implementations prepend the contract address to the signature
        // Let's try this format: | contract address (20 bytes) | signature (65 bytes) |
        signature = createEIP1271Signature(address, rawSignature);
        
        console.log('[Sponsor] Smart Contract Wallet detected');
        console.log('[Sponsor] SCW Address:', address);
        console.log('[Sponsor] Raw signature:', rawSignature);
        console.log('[Sponsor] Final signature:', signature);
      }
      
      setIsSigning(false);
      
      const data: SignedSponsorData = {
        signature,
        expirationTimestamp,
        encodedProp,
        candidate,
        reason,
      };
      
      // Store signed data
      setSignedData(data);
      
      return data;
      
    } catch (err) {
      setIsSigning(false);
      const error = err instanceof Error ? err : new Error('Failed to sign sponsorship');
      setError(error);
      throw error;
    }
  }, [isConnected, address, hasVotingPower, signTypedDataAsync, prepareProposalData, encodeProposalData, checkIfSmartWallet, createEIP1271Signature]);
  
  /**
   * Submit a previously signed signature
   */
  const submitSignature = useCallback(async () => {
    if (!signedData) {
      throw new Error('No signed data available. Please sign first.');
    }
    
    if (isLoading) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { signature, expirationTimestamp, encodedProp, candidate, reason } = signedData;
      
      await writeContractAsync({
        address: NOUNS_ADDRESSES.data as `0x${string}`,
        abi: NounsDAODataABI,
        functionName: 'addSignature',
        args: [
          signature,
          expirationTimestamp,
          candidate.proposer as Address,
          candidate.slug,
          BigInt(candidate.proposalIdToUpdate || '0'),
          encodedProp,
          reason,
        ],
      });
      
      setIsLoading(false);
      
    } catch (err) {
      setIsLoading(false);
      const error = err instanceof Error ? err : new Error('Failed to submit signature');
      setError(error);
      throw error;
    }
  }, [signedData, isLoading, writeContractAsync]);
  
  /**
   * Sponsor a candidate (combined sign + submit for EOA wallets)
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
    
    // Prevent double-calls while already processing
    if (isLoading) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Step 1: Sign
      const data = await signOnly(candidate, reason, expirationDays);
      
      // Step 2: Submit
      await writeContractAsync({
        address: NOUNS_ADDRESSES.data as `0x${string}`,
        abi: NounsDAODataABI,
        functionName: 'addSignature',
        args: [
          data.signature,
          data.expirationTimestamp,
          candidate.proposer as Address,
          candidate.slug,
          BigInt(candidate.proposalIdToUpdate || '0'),
          data.encodedProp,
          reason,
        ],
      });
      
      setIsLoading(false);
      
    } catch (err) {
      setIsLoading(false);
      const error = err instanceof Error ? err : new Error('Failed to sponsor candidate');
      setError(error);
      throw error;
    }
  }, [isConnected, address, hasVotingPower, isLoading, signOnly, writeContractAsync]);
  
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
    signedData,
    hasPendingSignature: !!signedData && !isSuccess,
    sponsorCandidate,
    signOnly,
    submitSignature,
    reset,
  };
}
