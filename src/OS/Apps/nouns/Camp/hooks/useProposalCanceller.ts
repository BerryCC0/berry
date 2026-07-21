/**
 * useProposalCanceller
 * Resolves who cancelled a proposal (the sender of the cancel transaction).
 * The DAO's ProposalCanceled event carries no actor, so this is looked up from
 * chain on demand — only enable it for proposals that are actually cancelled.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

export interface ProposalCancellerData {
  canceller: string | null;
  txHash?: string;
  cancelledTimestamp: string | null;
}

export function useProposalCanceller(
  proposalId: string | number | null | undefined,
  enabled: boolean
) {
  return useQuery<ProposalCancellerData, Error>({
    queryKey: ['camp', 'proposalCanceller', String(proposalId)],
    queryFn: async () => {
      const res = await fetch(`/api/proposals/${proposalId}/canceller`);
      if (!res.ok) throw new Error('Failed to resolve canceller');
      return (await res.json()) as ProposalCancellerData;
    },
    enabled: !!enabled && proposalId != null,
    // A cancellation is immutable once it happens.
    staleTime: Infinity,
    gcTime: 60 * 60_000,
    retry: 1,
  });
}
