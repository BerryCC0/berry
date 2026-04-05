/**
 * Client owner action hooks
 * Withdraw balance and update metadata for owned client NFTs
 */

'use client';

import { useAccount, useSimulateContract, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { ClientRewardsABI } from '@/app/lib/nouns/abis/ClientRewards';
import { CLIENT_REWARDS_ADDRESS } from '../constants';

/**
 * Hook for withdrawing a client's accumulated reward balance.
 * Requires the connected wallet to be the NFT owner.
 */
export function useWithdrawBalance(clientId: number, enabled: boolean) {
  const { address } = useAccount();

  // Read current on-chain balance
  const { data: balanceRaw, refetch: refetchBalance } = useReadContract({
    address: CLIENT_REWARDS_ADDRESS,
    abi: ClientRewardsABI,
    functionName: 'clientBalance',
    args: [clientId],
    query: { enabled },
  });

  const hasBalance = balanceRaw != null && balanceRaw > BigInt(0);

  const { data: simData, error: simError } = useSimulateContract({
    address: CLIENT_REWARDS_ADDRESS,
    abi: ClientRewardsABI,
    functionName: 'withdrawClientBalance',
    args: address && balanceRaw ? [clientId, address, balanceRaw] : undefined,
    query: { enabled: enabled && !!address && hasBalance },
  });

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const execute = () => {
    if (simData?.request) {
      writeContract(simData.request);
    }
  };

  return {
    execute,
    isPending,
    isConfirming,
    isSuccess,
    canExecute: !!simData?.request && !simError,
    balanceRaw,
    balanceFormatted: balanceRaw ? formatEther(balanceRaw) : '0',
    hasBalance,
    error: writeError || simError,
    reset,
    refetchBalance,
  };
}

/**
 * Hook for updating a client's on-chain name and description.
 * Requires the connected wallet to be the NFT owner.
 */
export function useUpdateMetadata(clientId: number, name: string, description: string, enabled: boolean) {
  const { data: simData, error: simError } = useSimulateContract({
    address: CLIENT_REWARDS_ADDRESS,
    abi: ClientRewardsABI,
    functionName: 'updateClientMetadata',
    args: [clientId, name, description],
    query: { enabled: enabled && name.length > 0 },
  });

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const execute = () => {
    if (simData?.request) {
      writeContract(simData.request);
    }
  };

  return {
    execute,
    isPending,
    isConfirming,
    isSuccess,
    canExecute: !!simData?.request && !simError,
    error: writeError || simError,
    reset,
  };
}
