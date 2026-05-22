/**
 * useClientMetadata
 * Reads `clientMetadata(clientId)` + `clientBalance(clientId)` from the
 * ClientRewards NFT contract. Surfaces the on-chain name, approval state,
 * lifetime rewards earned/withdrawn, and currently-unwithdrawn balance for
 * the admin-rewards-client-approval template's status line.
 *
 * Falls back to the bundled CLIENT_REGISTRY when the on-chain `name` is
 * empty (some clients registered without a descriptive name).
 */

'use client';

import { useReadContracts } from 'wagmi';
import { CLIENT_REWARDS_ADDRESS } from '../utils/actionTemplates/constants';
import { ClientRewardsABI } from '@/app/lib/nouns/abis/ClientRewards';
import { getClientName } from '@/OS/lib/clientNames';

export interface ClientMetadata {
  exists: boolean;
  approved: boolean | undefined;
  name: string | undefined;
  description: string | undefined;
  rewarded: bigint | undefined;
  withdrawn: bigint | undefined;
  unwithdrawn: bigint | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useClientMetadata(clientId: number | undefined): ClientMetadata {
  const enabled =
    typeof clientId === 'number' && clientId >= 0 && Number.isInteger(clientId);

  const { data, isLoading, isError } = useReadContracts({
    contracts: enabled
      ? [
          {
            address: CLIENT_REWARDS_ADDRESS,
            abi: ClientRewardsABI,
            functionName: 'clientMetadata' as const,
            args: [clientId as number],
          },
          {
            address: CLIENT_REWARDS_ADDRESS,
            abi: ClientRewardsABI,
            functionName: 'clientBalance' as const,
            args: [clientId as number],
          },
        ]
      : [],
    query: { enabled, staleTime: 60 * 1000 },
  });

  const metaResult =
    data?.[0]?.status === 'success'
      ? (data[0].result as {
          approved: boolean;
          rewarded: bigint;
          withdrawn: bigint;
          name: string;
          description: string;
        })
      : undefined;
  const balanceResult =
    data?.[1]?.status === 'success'
      ? (data[1].result as bigint)
      : undefined;

  // If clientMetadata reverts (clientId hasn't been minted), the read errors.
  // Treat that as "doesn't exist yet". The DAO can pre-approve future client
  // IDs but the more common case is approving an existing one.
  const exists = !!metaResult;
  const registryName =
    typeof clientId === 'number' ? getClientName(clientId) : null;

  return {
    exists,
    approved: metaResult?.approved,
    name: metaResult?.name && metaResult.name.length > 0
      ? metaResult.name
      : (registryName ?? undefined),
    description: metaResult?.description,
    rewarded: metaResult?.rewarded,
    withdrawn: metaResult?.withdrawn,
    unwithdrawn: balanceResult,
    isLoading,
    isError,
  };
}
