/**
 * useOctantPredictedVault
 * Calls `factory.computeStrategyAddress(...)` to predict the CREATE2 address
 * a Dragon vault will deploy to, given the proposer's chosen parameters.
 *
 * Used by the OctantCreateVaultEditor to (1) show the address the new vault
 * will land at before the proposal even executes, and (2) target the
 * bundled approve + deposit actions in the seed flow.
 *
 * All Octant strategy factories share the same `computeStrategyAddress`
 * signature (inherited from BaseStrategyFactory). The per-factory differences
 * — which `_vault` constant to pass, whether `_asset` is fixed or user-
 * supplied — are handled inside each factory's override. We just pass the
 * args through and surface any revert as `isError`.
 */

'use client';

import { useReadContract } from 'wagmi';
import { isAddress, type Address } from 'viem';

const COMPUTE_STRATEGY_ABI = [
  {
    name: 'computeStrategyAddress',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '_vault', type: 'address' },
      { name: '_asset', type: 'address' },
      { name: '_name', type: 'string' },
      { name: '_symbol', type: 'string' },
      { name: '_management', type: 'address' },
      { name: '_keeper', type: 'address' },
      { name: '_emergencyAdmin', type: 'address' },
      { name: '_donationAddress', type: 'address' },
      { name: '_enableBurning', type: 'bool' },
      { name: '_tokenizedStrategyAddress', type: 'address' },
      { name: '_deployer', type: 'address' },
    ],
    outputs: [{ type: 'address' }],
  },
] as const;

export interface UseOctantPredictedVaultArgs {
  factory: Address | undefined;
  vault: Address | undefined;
  asset: Address | undefined;
  name: string | undefined;
  symbol: string | undefined;
  management: Address | undefined;
  keeper: Address | undefined;
  emergencyAdmin: Address | undefined;
  donationAddress: Address | undefined;
  enableBurning: boolean;
  tokenizedStrategyAddress: Address | undefined;
  deployer: Address | undefined;
}

export interface UseOctantPredictedVaultReturn {
  predictedAddress: Address | undefined;
  isLoading: boolean;
  isError: boolean;
}

function allAddressesValid(args: UseOctantPredictedVaultArgs): boolean {
  return [
    args.factory,
    args.vault,
    args.asset,
    args.management,
    args.keeper,
    args.emergencyAdmin,
    args.donationAddress,
    args.tokenizedStrategyAddress,
    args.deployer,
  ].every((a) => !!a && isAddress(a));
}

export function useOctantPredictedVault(
  args: UseOctantPredictedVaultArgs,
): UseOctantPredictedVaultReturn {
  const enabled =
    allAddressesValid(args) &&
    typeof args.name === 'string' &&
    args.name.length > 0 &&
    typeof args.symbol === 'string' &&
    args.symbol.length > 0;

  const { data, isLoading, isError } = useReadContract({
    address: args.factory,
    abi: COMPUTE_STRATEGY_ABI,
    functionName: 'computeStrategyAddress',
    args: enabled
      ? [
          args.vault as Address,
          args.asset as Address,
          args.name as string,
          args.symbol as string,
          args.management as Address,
          args.keeper as Address,
          args.emergencyAdmin as Address,
          args.donationAddress as Address,
          args.enableBurning,
          args.tokenizedStrategyAddress as Address,
          args.deployer as Address,
        ]
      : undefined,
    query: {
      enabled,
      staleTime: 30 * 1000,
    },
  });

  return {
    predictedAddress: data as Address | undefined,
    isLoading,
    isError,
  };
}
