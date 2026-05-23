/**
 * Looks up Food Nouns owned by an address (and current voting power).
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { FN_CONTRACTS, FN_CHAIN_ID } from '../contracts';

export interface FNHoldings {
  balance: bigint;
  tokenIds: bigint[];
  votes: bigint;
  delegate: `0x${string}`;
}

export function useFNHoldings(address: `0x${string}` | undefined) {
  const publicClient = usePublicClient({ chainId: FN_CHAIN_ID });

  return useQuery<FNHoldings>({
    queryKey: ['fn', 'holdings', address ?? null],
    enabled: !!publicClient && !!address,
    staleTime: 30_000,
    queryFn: async () => {
      if (!publicClient || !address) {
        return { balance: BigInt(0), tokenIds: [], votes: BigInt(0), delegate: '0x0000000000000000000000000000000000000000' };
      }

      const [balance, votes, delegate] = await Promise.all([
        publicClient.readContract({
          address: FN_CONTRACTS.token.address,
          abi: FN_CONTRACTS.token.abi,
          functionName: 'balanceOf',
          args: [address],
        }),
        publicClient.readContract({
          address: FN_CONTRACTS.token.address,
          abi: FN_CONTRACTS.token.abi,
          functionName: 'getCurrentVotes',
          args: [address],
        }),
        publicClient.readContract({
          address: FN_CONTRACTS.token.address,
          abi: FN_CONTRACTS.token.abi,
          functionName: 'delegates',
          args: [address],
        }),
      ]);

      const balanceN = balance as bigint;
      const tokenIds: bigint[] = [];
      for (let i = BigInt(0); i < balanceN; i += BigInt(1)) {
        try {
          const id = (await publicClient.readContract({
            address: FN_CONTRACTS.token.address,
            abi: FN_CONTRACTS.token.abi,
            functionName: 'tokenOfOwnerByIndex',
            args: [address, i],
          })) as bigint;
          tokenIds.push(id);
        } catch {
          break;
        }
      }

      return {
        balance: balanceN,
        tokenIds: tokenIds.sort((a, b) => Number(a - b)),
        votes: votes as bigint,
        delegate: delegate as `0x${string}`,
      };
    },
  });
}

