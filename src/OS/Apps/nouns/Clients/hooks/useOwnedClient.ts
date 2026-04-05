/**
 * Detect if the connected wallet owns a Client NFT.
 * Uses balanceOf to check ownership, then multicall ownerOf to find the tokenId.
 * Also reads the on-chain clientBalance for withdraw functionality.
 */

'use client';

import { useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { ClientRewardsABI } from '@/app/lib/nouns/abis/ClientRewards';
import { CLIENT_REWARDS_ADDRESS } from '../constants';
import type { ClientData } from '../types';

export function useOwnedClient(clients?: ClientData[]) {
  const { address } = useAccount();

  // Check if the connected address owns any client NFT
  const { data: nftBalance, isLoading: balanceLoading } = useReadContract({
    address: CLIENT_REWARDS_ADDRESS,
    abi: ClientRewardsABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const hasNft = nftBalance != null && nftBalance > BigInt(0);

  // Build ownerOf calls for all known client IDs
  const ownerOfCalls = useMemo(() => {
    if (!hasNft || !clients?.length) return [];
    return clients.map((c) => ({
      address: CLIENT_REWARDS_ADDRESS as `0x${string}`,
      abi: ClientRewardsABI,
      functionName: 'ownerOf' as const,
      args: [BigInt(c.clientId)] as const,
    }));
  }, [hasNft, clients]);

  // Multicall ownerOf for all client IDs
  const { data: ownerResults, isLoading: ownersLoading } = useReadContracts({
    contracts: ownerOfCalls,
    query: { enabled: ownerOfCalls.length > 0 },
  });

  // Find the client ID owned by the connected address
  const ownedClientId = useMemo(() => {
    if (!address || !ownerResults?.length || !clients?.length) return null;
    const lowerAddress = address.toLowerCase();
    for (let i = 0; i < ownerResults.length; i++) {
      const result = ownerResults[i];
      if (result.status === 'success' && (result.result as string).toLowerCase() === lowerAddress) {
        return clients[i].clientId;
      }
    }
    return null;
  }, [address, ownerResults, clients]);

  // Read the on-chain reward balance for the owned client
  const { data: clientBalanceRaw } = useReadContract({
    address: CLIENT_REWARDS_ADDRESS,
    abi: ClientRewardsABI,
    functionName: 'clientBalance',
    args: ownedClientId != null ? [ownedClientId] : undefined,
    query: { enabled: ownedClientId != null },
  });

  return {
    ownedClientId,
    clientBalance: clientBalanceRaw ?? null,
    isLoading: balanceLoading || ownersLoading,
  };
}
