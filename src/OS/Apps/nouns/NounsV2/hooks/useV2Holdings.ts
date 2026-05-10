/**
 * V2 Nouns owned by an address + current voting power + delegate.
 * Iterates tokenOfOwnerByIndex (ERC721Enumerable) for the connected wallet.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { V2_CONTRACTS, V2_CHAIN_ID } from '../contracts';

export interface V2Holdings {
  balance: bigint;
  tokenIds: bigint[];
  votes: bigint;
  delegate: `0x${string}`;
}

const ZERO: `0x${string}` = '0x0000000000000000000000000000000000000000';

export function useV2Holdings(address: `0x${string}` | undefined) {
  const publicClient = usePublicClient({ chainId: V2_CHAIN_ID });

  return useQuery<V2Holdings>({
    queryKey: ['v2', 'holdings', address ?? null],
    enabled: !!publicClient && !!address,
    staleTime: 30_000,
    queryFn: async () => {
      if (!publicClient || !address) {
        return { balance: BigInt(0), tokenIds: [], votes: BigInt(0), delegate: ZERO };
      }

      const [balance, votes, delegate] = await Promise.all([
        publicClient.readContract({
          address: V2_CONTRACTS.token.address,
          abi: V2_CONTRACTS.token.abi,
          functionName: 'balanceOf',
          args: [address],
        }),
        publicClient.readContract({
          address: V2_CONTRACTS.token.address,
          abi: V2_CONTRACTS.token.abi,
          functionName: 'getCurrentVotes',
          args: [address],
        }),
        publicClient.readContract({
          address: V2_CONTRACTS.token.address,
          abi: V2_CONTRACTS.token.abi,
          functionName: 'delegates',
          args: [address],
        }),
      ]);

      const balanceN = balance as bigint;
      const tokenIds: bigint[] = [];
      for (let i = BigInt(0); i < balanceN; i += BigInt(1)) {
        try {
          const id = (await publicClient.readContract({
            address: V2_CONTRACTS.token.address,
            abi: V2_CONTRACTS.token.abi,
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
