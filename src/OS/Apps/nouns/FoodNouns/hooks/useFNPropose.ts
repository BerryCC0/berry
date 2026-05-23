/**
 * Submit, queue, execute, or cancel Food Nouns proposals.
 */

'use client';

import { type Hex } from 'viem';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { FN_CONTRACTS, FN_CHAIN_ID } from '../contracts';

export interface FNProposeArgs {
  targets: `0x${string}`[];
  values: bigint[];
  signatures: string[];
  calldatas: Hex[];
  description: string;
}

export function useFNPropose() {
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: confirmError } = useWaitForTransactionReceipt({ hash });

  const propose = (args: FNProposeArgs) => {
    writeContract({
      address: FN_CONTRACTS.governor.address,
      abi: FN_CONTRACTS.governor.abi,
      functionName: 'propose',
      args: [args.targets, args.values, args.signatures, args.calldatas, args.description],
      chainId: FN_CHAIN_ID,
    });
  };

  const queue = (proposalId: bigint) => {
    writeContract({
      address: FN_CONTRACTS.governor.address,
      abi: FN_CONTRACTS.governor.abi,
      functionName: 'queue',
      args: [proposalId],
      chainId: FN_CHAIN_ID,
    });
  };

  const execute = (proposalId: bigint) => {
    writeContract({
      address: FN_CONTRACTS.governor.address,
      abi: FN_CONTRACTS.governor.abi,
      functionName: 'execute',
      args: [proposalId],
      chainId: FN_CHAIN_ID,
    });
  };

  const cancel = (proposalId: bigint) => {
    writeContract({
      address: FN_CONTRACTS.governor.address,
      abi: FN_CONTRACTS.governor.abi,
      functionName: 'cancel',
      args: [proposalId],
      chainId: FN_CHAIN_ID,
    });
  };

  return {
    propose,
    queue,
    execute,
    cancel,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError ?? confirmError ?? null,
    reset,
  };
}

export function useFNGovernanceParams() {
  const threshold = useReadContract({
    address: FN_CONTRACTS.governor.address,
    abi: FN_CONTRACTS.governor.abi,
    functionName: 'proposalThreshold',
    chainId: FN_CHAIN_ID,
  });

  const quorum = useReadContract({
    address: FN_CONTRACTS.governor.address,
    abi: FN_CONTRACTS.governor.abi,
    functionName: 'quorumVotes',
    chainId: FN_CHAIN_ID,
  });

  return {
    proposalThreshold: (threshold.data ?? BigInt(0)) as bigint,
    quorumVotes: (quorum.data ?? BigInt(0)) as bigint,
    isLoading: threshold.isLoading || quorum.isLoading,
  };
}
