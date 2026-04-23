/**
 * useSponsorActiveProposals
 *
 * For each candidate sponsor, checks whether they already have a live
 * proposal on-chain. `proposeBySigs` reverts if any signer has a proposal
 * in Pending/Active/ObjectionPeriod/Updatable state (`checkNoActiveProp`).
 * Pre-flighting this lets the UI warn the user *which* sponsor is blocking
 * promotion instead of surfacing a cryptic gas-estimation failure.
 */

'use client';

import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { NOUNS_CONTRACTS } from '@/app/lib/nouns/contracts';

// ProposalState enum from NounsDAOLogicV3 (order matters — indexed by uint8):
//   0 Pending, 1 Active, 2 Canceled, 3 Defeated, 4 Succeeded, 5 Queued,
//   6 Expired, 7 Executed, 8 Vetoed, 9 ObjectionPeriod, 10 Updatable
// Only these count as "live" for the on-chain checkNoActiveProp gate.
const LIVE_PROPOSAL_STATES = new Set<number>([
  0, // Pending
  1, // Active
  9, // ObjectionPeriod
  10, // Updatable
]);

export interface SponsorConflict {
  signer: string;
  proposalId: bigint;
}

export function useSponsorActiveProposals(signers: string[]) {
  const uniqueSigners = useMemo(() => {
    const set = new Set<string>();
    for (const s of signers) set.add(s.toLowerCase());
    return Array.from(set);
  }, [signers]);

  // Step 1: latestProposalIds(signer) for each sponsor
  const { data: latestIdsData, isLoading: isLoadingIds } = useReadContracts({
    contracts: uniqueSigners.map((signer) => ({
      address: NOUNS_CONTRACTS.governor.address,
      abi: NOUNS_CONTRACTS.governor.abi,
      functionName: 'latestProposalIds',
      args: [signer as `0x${string}`],
    })),
    query: { enabled: uniqueSigners.length > 0 },
  });

  // Step 2: state(proposalId) for each nonzero latest id
  const stateQueries = useMemo(() => {
    const queries: { signer: string; proposalId: bigint }[] = [];
    if (!latestIdsData) return queries;
    for (let i = 0; i < uniqueSigners.length; i++) {
      const result = latestIdsData[i];
      if (result?.status !== 'success') continue;
      const id = result.result as bigint;
      if (id && id > BigInt(0)) {
        queries.push({ signer: uniqueSigners[i], proposalId: id });
      }
    }
    return queries;
  }, [latestIdsData, uniqueSigners]);

  const { data: statesData, isLoading: isLoadingStates } = useReadContracts({
    contracts: stateQueries.map(({ proposalId }) => ({
      address: NOUNS_CONTRACTS.governor.address,
      abi: NOUNS_CONTRACTS.governor.abi,
      functionName: 'state',
      args: [proposalId],
    })),
    query: { enabled: stateQueries.length > 0 },
  });

  const conflicts = useMemo<SponsorConflict[]>(() => {
    if (!statesData) return [];
    const out: SponsorConflict[] = [];
    for (let i = 0; i < stateQueries.length; i++) {
      const result = statesData[i];
      if (result?.status !== 'success') continue;
      const state = Number(result.result);
      if (LIVE_PROPOSAL_STATES.has(state)) {
        out.push(stateQueries[i]);
      }
    }
    return out;
  }, [statesData, stateQueries]);

  const conflictsBySigner = useMemo(() => {
    const map = new Map<string, bigint>();
    for (const c of conflicts) map.set(c.signer.toLowerCase(), c.proposalId);
    return map;
  }, [conflicts]);

  return {
    conflicts,
    conflictsBySigner,
    isLoading: isLoadingIds || isLoadingStates,
  };
}
