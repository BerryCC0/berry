/**
 * useTreasuryOctantVaults
 * Discover Octant Dragon vaults the Nouns treasury has previously deployed.
 *
 * Strategy: query `StrategyDeploy` event logs from each of the 4 Octant
 * factories, filtered by `deployer = TREASURY_ADDRESS`. Combine, sort by
 * deployment block (newest first), and surface as a vault list.
 *
 * Each factory emits the same canonical event:
 *   StrategyDeploy(
 *     address indexed deployer,
 *     address indexed donationAddress,
 *     address indexed strategyAddress,
 *     string vaultTokenName
 *   )
 *
 * The query is cheap to cache (vault deployments are rare events) so we
 * cache for 5 minutes via react-query.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { type Address, type Log, parseAbiItem } from 'viem';
import {
  OCTANT_FACTORIES,
  OCTANT_LIDO_FACTORY_ADDRESS,
  OCTANT_MORPHO_FACTORY_ADDRESS,
  OCTANT_SKY_FACTORY_ADDRESS,
  OCTANT_YEARN_FACTORY_ADDRESS,
  TREASURY_ADDRESS,
} from '../utils/actionTemplates/constants';

export interface DiscoveredVault {
  /** Deployed vault address */
  address: Address;
  /** Vault name from the StrategyDeploy event */
  name: string;
  /** Donation address configured at deployment */
  donationAddress: Address;
  /** Which Octant factory deployed this vault */
  factorySource: 'lido' | 'morpho' | 'sky' | 'yearn';
  /** Factory address for display */
  factoryAddress: Address;
  /** Block number of deployment */
  blockNumber: bigint;
  /** Tx hash for the explorer link */
  transactionHash: `0x${string}`;
}

const STRATEGY_DEPLOY_EVENT = parseAbiItem(
  'event StrategyDeploy(address indexed deployer, address indexed donationAddress, address indexed strategyAddress, string vaultTokenName)',
);

// All four factories share the same event shape, so we can fan out one
// getLogs per factory and aggregate.
const FACTORY_ADDRESSES: { address: Address; source: 'lido' | 'morpho' | 'sky' | 'yearn' }[] = [
  { address: OCTANT_LIDO_FACTORY_ADDRESS, source: 'lido' },
  { address: OCTANT_MORPHO_FACTORY_ADDRESS, source: 'morpho' },
  { address: OCTANT_SKY_FACTORY_ADDRESS, source: 'sky' },
  { address: OCTANT_YEARN_FACTORY_ADDRESS, source: 'yearn' },
];

interface UseTreasuryOctantVaultsReturn {
  vaults: DiscoveredVault[];
  isLoading: boolean;
  isError: boolean;
}

/**
 * Discover Octant Dragon vaults deployed by the Nouns treasury via any of
 * the registered factories. Cached for 5 minutes — these events are rare.
 */
export function useTreasuryOctantVaults(): UseTreasuryOctantVaultsReturn {
  const publicClient = usePublicClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['octant-treasury-vaults', publicClient?.chain?.id ?? 1],
    enabled: !!publicClient,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!publicClient) return [];

      const perFactory = await Promise.all(
        FACTORY_ADDRESSES.map(async ({ address, source }) => {
          try {
            const logs = await publicClient.getLogs({
              address,
              event: STRATEGY_DEPLOY_EVENT,
              args: { deployer: TREASURY_ADDRESS },
              fromBlock: 'earliest',
              toBlock: 'latest',
            });
            return { address, source, logs: logs as Log[] };
          } catch {
            // Some RPCs cap log ranges. Swallow + return empty for this
            // factory rather than failing the whole discovery.
            return { address, source, logs: [] as Log[] };
          }
        }),
      );

      const aggregated: DiscoveredVault[] = [];
      for (const { address, source, logs } of perFactory) {
        for (const log of logs) {
          // viem returns decoded args on parsed events
          const args = (log as unknown as {
            args: {
              deployer: Address;
              donationAddress: Address;
              strategyAddress: Address;
              vaultTokenName: string;
            };
            blockNumber: bigint;
            transactionHash: `0x${string}`;
          }).args;
          if (!args) continue;
          aggregated.push({
            address: args.strategyAddress,
            name: args.vaultTokenName,
            donationAddress: args.donationAddress,
            factorySource: source,
            factoryAddress: address,
            blockNumber: (log as unknown as { blockNumber: bigint }).blockNumber,
            transactionHash: (log as unknown as { transactionHash: `0x${string}` }).transactionHash,
          });
        }
      }

      // Sort by block number, newest first
      aggregated.sort((a, b) => (a.blockNumber > b.blockNumber ? -1 : 1));

      return aggregated;
    },
  });

  return {
    vaults: data ?? [],
    isLoading,
    isError,
  };
}

/**
 * Look up factory metadata (asset symbol, yield mode) for a discovered vault.
 * Returns undefined if the factory isn't recognised.
 */
export function vaultFactoryMeta(vault: DiscoveredVault) {
  return OCTANT_FACTORIES[vault.factoryAddress.toLowerCase()];
}
