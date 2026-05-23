/**
 * useSimulation Hook
 * Automatically simulates proposal/candidate actions via Tenderly
 */

'use client';

import { useQuery } from '@tanstack/react-query';

export interface ProposalAction {
  target: string;
  value: string;
  signature: string;
  calldata: string;
}

export interface TransactionResult {
  success: boolean;
  gasUsed: string;
  error?: string;
  errorMessage?: string;
}

export interface SimulationResult {
  success: boolean;
  results: TransactionResult[];
  totalGasUsed: string;
  error?: string;
  /** Shareable Tenderly simulation URL (if Dashboard API is configured) */
  shareUrl?: string;
}

async function simulateActions(
  actions: ProposalAction[],
  from: string | undefined,
): Promise<SimulationResult> {
  const response = await fetch('/api/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actions, ...(from ? { from } : {}) }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Simulation failed');
  }

  return response.json();
}

/**
 * Hook to simulate proposal actions.
 *
 * Automatically runs simulation when actions are provided. Pass `from` to
 * override the simulation's caller address — this matters whenever an action
 * depends on `msg.sender` matching a specific contract (e.g., Seaport's
 * `validate()` accepting an empty signature only when the caller IS the
 * order's offerer).
 *
 * For Nouns proposals the right `from` is the timelock that will execute
 * the proposal: V2 treasury for standard proposals, V1 treasury for
 * timelock-v1 proposals. The default (V2) matches the common case; the
 * creator form passes V1 explicitly when `proposalType === 'timelock_v1'`.
 */
export function useSimulation(
  actions: ProposalAction[] | undefined | null,
  from?: string,
) {
  const hasActions = Boolean(actions && actions.length > 0);

  // Create a stable cache key from actions + sender — same actions simulated
  // from different senders are NOT the same result.
  const cacheKey = hasActions && actions
    ? JSON.stringify({
        from: from ?? '',
        actions: actions.map(a => `${a.target}:${a.value}:${a.signature}:${a.calldata}`),
      })
    : '';

  const {
    data: result,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['simulation', cacheKey],
    queryFn: () => simulateActions(actions!, from),
    enabled: hasActions,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1, // Only retry once on failure
  });

  return {
    result,
    isLoading: hasActions ? isLoading : false,
    error: error as Error | null,
    refetch,
    hasActions,
  };
}
