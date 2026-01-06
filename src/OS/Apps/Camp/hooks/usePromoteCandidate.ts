/**
 * usePromoteCandidate Hook
 * Promotes a candidate to a full proposal using sponsor signatures
 */

'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { NOUNS_CONTRACTS } from '@/app/lib/nouns/contracts';
import type { Candidate, CandidateSignature } from '../types';

// Berry client ID for Nouns rewards
const CLIENT_ID = 12;

interface PromoteState {
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  transactionHash?: string;
  proposalId?: number;
}

export function usePromoteCandidate() {
  const { address, isConnected } = useAccount();
  const [promoteState, setPromoteState] = useState<PromoteState>({
    isSuccess: false,
    isError: false,
    error: null,
  });

  const { 
    writeContract, 
    data: transactionHash,
    error: writeError,
    isPending: isWritePending,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash: transactionHash,
  });

  const promoteCandidate = async (candidate: Candidate) => {
    if (!isConnected || !address) {
      setPromoteState({
        isSuccess: false,
        isError: true,
        error: new Error('Please connect your wallet first'),
      });
      return;
    }

    if (!candidate.signatures || candidate.signatures.length === 0) {
      setPromoteState({
        isSuccess: false,
        isError: true,
        error: new Error('No valid signatures found'),
      });
      return;
    }

    if (!candidate.actions || candidate.actions.length === 0) {
      setPromoteState({
        isSuccess: false,
        isError: true,
        error: new Error('No actions found in candidate'),
      });
      return;
    }

    try {
      // Reset previous states
      setPromoteState({
        isSuccess: false,
        isError: false,
        error: null,
      });
      resetWrite();

      // Prepare the proposer signatures array
      const proposerSignatures = candidate.signatures.map((sig: CandidateSignature) => ({
        sig: sig.sig as `0x${string}`,
        signer: sig.signer as `0x${string}`,
        expirationTimestamp: BigInt(sig.expirationTimestamp),
      }));

      // Prepare proposal data from actions
      const targets = candidate.actions.map(a => a.target as `0x${string}`);
      const values = candidate.actions.map(a => BigInt(a.value || '0'));
      const signatures = candidate.actions.map(a => a.signature);
      const calldatas = candidate.actions.map(a => {
        if (!a.calldata || a.calldata === '') return '0x' as `0x${string}`;
        return (a.calldata.startsWith('0x') ? a.calldata : `0x${a.calldata}`) as `0x${string}`;
      });

      // Build description from title and description
      const description = candidate.title 
        ? `# ${candidate.title}\n\n${candidate.description}`
        : candidate.description;

      // Call the contract
      writeContract({
        address: NOUNS_CONTRACTS.governor.address,
        abi: NOUNS_CONTRACTS.governor.abi,
        functionName: 'proposeBySigs',
        args: [
          proposerSignatures,
          targets,
          values,
          signatures,
          calldatas,
          description,
          CLIENT_ID,
        ],
      });

    } catch (error) {
      setPromoteState({
        isSuccess: false,
        isError: true,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      });
    }
  };

  // Update state based on transaction status
  useEffect(() => {
    if (isConfirmed && receipt) {
      // Extract proposal ID from the transaction receipt logs
      let proposalId: number | undefined;
      
      // Look for ProposalCreated event
      if (receipt.logs) {
        for (const log of receipt.logs) {
          // The first topic after the event signature should be the proposal ID
          if (log.topics && log.topics.length > 1) {
            try {
              proposalId = parseInt(log.topics[1] || '0x0', 16);
              break;
            } catch {
              // Continue looking
            }
          }
        }
      }

      setPromoteState({
        isSuccess: true,
        isError: false,
        error: null,
        transactionHash: transactionHash,
        proposalId,
      });
    } else if (writeError) {
      setPromoteState({
        isSuccess: false,
        isError: true,
        error: writeError,
      });
    }
  }, [isConfirmed, writeError, transactionHash, receipt]);

  const reset = () => {
    setPromoteState({
      isSuccess: false,
      isError: false,
      error: null,
    });
    resetWrite();
  };

  return {
    promoteCandidate,
    isLoading: isWritePending || isConfirming,
    isSuccess: promoteState.isSuccess,
    isError: promoteState.isError,
    error: promoteState.error,
    transactionHash: promoteState.transactionHash,
    proposalId: promoteState.proposalId,
    isConnected,
    address,
    reset,
  };
}
