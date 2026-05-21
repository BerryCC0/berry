/**
 * useOctantPredictedSplitter
 * Reads `PaymentSplitterFactory.predictDeterministicAddress(deployer)` to
 * compute the address the next splitter cloned by `deployer` will land at.
 *
 * Used by OctantCreateVaultEditor when the user bundles a new PaymentSplitter
 * as the donation address — the createStrategy call needs the splitter's
 * predicted address as input so the vault's CREATE2 hash matches.
 *
 * The factory uses `salt = keccak256(abi.encode(msg.sender, deployerToSplitters[msg.sender].length))`
 * so the prediction is purely a function of (deployer, current count) and
 * doesn't depend on the payee list.
 */

'use client';

import { useReadContract } from 'wagmi';
import { type Address, isAddress } from 'viem';
import { OCTANT_PAYMENT_SPLITTER_FACTORY_ADDRESS } from '../utils/actionTemplates/constants';

const PREDICT_ABI = [
  {
    name: 'predictDeterministicAddress',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'deployer', type: 'address' }],
    outputs: [{ type: 'address' }],
  },
] as const;

export interface UseOctantPredictedSplitterReturn {
  predictedAddress: Address | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useOctantPredictedSplitter(
  deployer: Address | undefined,
): UseOctantPredictedSplitterReturn {
  const enabled = !!deployer && isAddress(deployer);

  const { data, isLoading, isError } = useReadContract({
    address: OCTANT_PAYMENT_SPLITTER_FACTORY_ADDRESS,
    abi: PREDICT_ABI,
    functionName: 'predictDeterministicAddress',
    args: enabled ? [deployer as Address] : undefined,
    query: { enabled, staleTime: 60 * 1000 },
  });

  return {
    predictedAddress: data as Address | undefined,
    isLoading,
    isError,
  };
}
