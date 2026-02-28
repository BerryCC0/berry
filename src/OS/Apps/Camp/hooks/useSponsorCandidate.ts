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

import { useState, useCallback, useRef } from 'react';
import { useAccount, useSignTypedData, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { NOUNS_ADDRESSES, NounsDAODataABI, NounsTokenABI } from '@/app/lib/nouns/contracts';
import { encodeAbiParameters, parseAbiParameters, keccak256, toBytes, encodePacked } from 'viem';
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

// Domain for EIP-712 signature - uses the DAO governor as verifyingContract,
// matching NounsDAOProposals.sigDigest which passes nounsDao as the verifier
const NOUNS_DAO_DATA_DOMAIN = {
  name: 'Nouns DAO',
  chainId: 1,
  verifyingContract: NOUNS_ADDRESSES.governor as `0x${string}`,
};

// EIP-712 types for proposal signature
// IMPORTANT: The field name must be 'expiry' to match the contract's PROPOSAL_TYPEHASH:
// keccak256('Proposal(address proposer,address[] targets,uint256[] values,string[] signatures,bytes[] calldatas,string description,uint256 expiry)')
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
   * Encode proposal data matching NounsDAOProposals.calcProposalEncodeData.
   * Each dynamic field is individually hashed per EIP-712, producing a compact
   * 192-byte encoding: abi.encode(address, bytes32, bytes32, bytes32, bytes32, bytes32)
   */
  const encodeProposalData = useCallback((
    proposer: Address,
    targets: Address[],
    values: bigint[],
    signatures: string[],
    calldatas: `0x${string}`[],
    description: string
  ): `0x${string}` => {
    const targetsHash = keccak256(
      encodeAbiParameters(
        targets.map(() => ({ type: 'address' as const })),
        targets
      )
    );

    const valuesHash = keccak256(
      encodePacked(
        values.map(() => 'uint256' as const),
        values
      )
    );

    const signatureHashes = signatures.map(s => keccak256(toBytes(s)));
    const sigsHash = keccak256(
      encodePacked(
        signatureHashes.map(() => 'bytes32' as const),
        signatureHashes
      )
    );

    const calldatasHashes = calldatas.map(c => keccak256(c));
    const calldatasHash = keccak256(
      encodePacked(
        calldatasHashes.map(() => 'bytes32' as const),
        calldatasHashes
      )
    );

    const descriptionHash = keccak256(toBytes(description));

    return encodeAbiParameters(
      parseAbiParameters('address, bytes32, bytes32, bytes32, bytes32, bytes32'),
      [proposer, targetsHash, valuesHash, sigsHash, calldatasHash, descriptionHash]
    );
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
   * For the Nouns Data contract, when msg.sender (the Safe) calls addSignature:
   * 1. The contract first tries ecrecover on the signature
   * 2. If the recovered address doesn't have votes but msg.sender does, 
   *    it calls isValidSignature on msg.sender (the Safe)
   * 3. The Safe's isValidSignature verifies the signature is from an owner
   * 
   * We just pass the raw ECDSA signature - the Safe handles EIP-1271 verification internally
   */
  const createEIP1271Signature = useCallback((
    _signerAddress: Address,
    rawSignature: Hex
  ): Hex => {
    // The Nouns contract's SignatureChecker will:
    // 1. Try ecrecover - gets owner's EOA address  
    // 2. Check if msg.sender (Safe) has votes
    // 3. Call Safe.isValidSignature(hash, signature)
    // 4. Safe verifies the signature is from one of its owners
    // 
    // Just return the raw signature - no special formatting needed
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
      
      // Sign EIP-712 typed data
      // Note: The message field 'expiry' must match the PROPOSAL_TYPEHASH in the contract
      const rawSignature = await signTypedDataAsync({
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
          expiry: expirationTimestamp, // Field name is 'expiry' in the typehash
        },
      });
      
      // For smart contract wallets, the signature needs special handling
      // The raw signature from signTypedData is signed by the Safe owner,
      // but we need the Nouns contract to recognize the Safe as the signer
      let signature = rawSignature;
      
      if (isSCW) {
        // For Smart Contract Wallets (Safe, etc.):
        // - The raw signature is signed by one of the Safe's owners
        // - When the Safe calls addSignature, the Nouns contract will call isValidSignature on the Safe
        // - The Safe verifies the signature is from one of its owners
        // - Just pass the raw signature through - no special formatting needed
        signature = createEIP1271Signature(address, rawSignature);
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
  
  // Ref guard to absolutely prevent duplicate writeContractAsync calls
  const writeGuardRef = useRef(false);

  /**
   * Sponsor a candidate (combined sign + submit for EOA wallets).
   * No state updates between sign and write to prevent mid-flow re-renders
   * that could cause wagmi hooks to produce duplicate transaction requests.
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
    
    if (writeGuardRef.current) {
      return;
    }
    
    writeGuardRef.current = true;
    setIsLoading(true);
    setIsSigning(true);
    setError(null);
    
    try {
      const { proposer, targets, values, signatures, calldatas, description } = prepareProposalData(candidate);
      const expirationTimestamp = BigInt(Math.floor(Date.now() / 1000) + (expirationDays * 24 * 60 * 60));
      const encodedProp = encodeProposalData(proposer, targets, values, signatures, calldatas, description);
      
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
          expiry: expirationTimestamp,
        },
      });
      
      // No state updates here -- go directly to write to prevent re-renders
      // that could cause duplicate transaction requests from wagmi hooks
      
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
      setIsSigning(false);
      
    } catch (err) {
      setIsLoading(false);
      setIsSigning(false);
      const error = err instanceof Error ? err : new Error('Failed to sponsor candidate');
      setError(error);
      throw error;
    } finally {
      writeGuardRef.current = false;
    }
  }, [isConnected, address, hasVotingPower, signTypedDataAsync, writeContractAsync, prepareProposalData, encodeProposalData]);
  
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
