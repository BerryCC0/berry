/**
 * Cycle Votes API Route
 * Returns vote weight summed by client_id for a given set of proposal IDs,
 * both aggregated and per-proposal.
 *
 * Two modes:
 * 1. ?proposalIds=1,2,3 — explicit proposal IDs (legacy)
 * 2. No params — auto-determines eligible proposals from Ponder DB,
 *    eliminating the need for the client to know nextProposalIdToReward first.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { ponderSql } from '@/app/lib/ponder-db';
import { NounsDAOABI, NOUNS_ADDRESSES } from '@/app/lib/nouns/contracts';
import { ClientRewardsABI } from '@/app/lib/nouns/abis/ClientRewards';

const CLIENT_REWARDS_ADDRESS = '0x883860178F95d0C82413eDc1D6De530cB4771d55' as const;

/**
 * Read the incentive eligibility quorum from on-chain:
 * adjustedTotalSupply * proposalEligibilityQuorumBps / 10000
 */
async function getIncentiveQuorum(): Promise<number> {
  const client = createPublicClient({ chain: mainnet, transport: http() });
  const [adjustedTotalSupply, rewardParams] = await Promise.all([
    client.readContract({
      address: NOUNS_ADDRESSES.governor,
      abi: NounsDAOABI,
      functionName: 'adjustedTotalSupply',
    }) as Promise<bigint>,
    client.readContract({
      address: CLIENT_REWARDS_ADDRESS,
      abi: ClientRewardsABI,
      functionName: 'getProposalRewardParams',
    }) as Promise<{ proposalEligibilityQuorumBps: number }>,
  ]);
  const supply = Number(adjustedTotalSupply);
  const bps = Number(rewardParams.proposalEligibilityQuorumBps);
  return Math.floor(supply * bps / 10000);
}

/**
 * Auto-determine eligible proposal IDs from Ponder DB.
 * Uses the contract's incentive quorum (proposalEligibilityQuorumBps * adjustedTotalSupply / 10000)
 * rather than the DAO governance quorum. DEFEATED proposals can still qualify.
 *   - id > lastRewardedProposalId (derived from most recent PROPOSAL reward_update)
 *   - client_id IS NOT NULL
 *   - status not CANCELLED or VETOED
 *   - for_votes >= incentive quorum threshold
 */
async function getEligibleProposalIds(sql: ReturnType<typeof ponderSql>): Promise<number[]> {
  // Read incentive quorum from on-chain in parallel with DB query for last rewarded ID
  const [incentiveQuorum, lastUpdateRows] = await Promise.all([
    getIncentiveQuorum(),
    sql`
      SELECT params->>'lastProposalId' as last_proposal_id
      FROM ponder_live.reward_updates
      WHERE update_type = 'PROPOSAL'
      ORDER BY block_timestamp DESC
      LIMIT 1
    `,
  ]);
  const lastRewardedId = lastUpdateRows.length > 0 && lastUpdateRows[0].last_proposal_id
    ? parseInt(lastUpdateRows[0].last_proposal_id, 10)
    : 0;

  // Find eligible proposals in the current cycle using incentive quorum threshold
  const rows = await sql`
    SELECT id
    FROM ponder_live.proposals
    WHERE id > ${lastRewardedId}
      AND client_id IS NOT NULL
      AND status NOT IN ('CANCELLED', 'VETOED')
      AND for_votes >= ${incentiveQuorum}
    ORDER BY id
  `;

  return rows.map((r: any) => Number(r.id));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const proposalIdsParam = searchParams.get('proposalIds');

  try {
    const sql = ponderSql();

    // Determine which proposal IDs to query
    let proposalIds: number[];
    if (proposalIdsParam) {
      proposalIds = proposalIdsParam.split(',').map(Number).filter((n) => !isNaN(n));
    } else {
      // Auto-determine eligible proposals server-side
      proposalIds = await getEligibleProposalIds(sql);
    }

    if (proposalIds.length === 0) {
      return NextResponse.json({ votes: [], votesByProposal: [] });
    }

    // Run both queries in parallel
    const [aggregateRows, perProposalRows] = await Promise.all([
      // Aggregate vote weight per client across all given proposals (includes votes with no client)
      sql`
        SELECT v.client_id, COALESCE(SUM(v.votes), 0)::int as vote_count, c.name
        FROM ponder_live.votes v
        LEFT JOIN ponder_live.clients c ON v.client_id = c.client_id
        WHERE v.proposal_id = ANY(${proposalIds})
        GROUP BY v.client_id, c.name
        ORDER BY vote_count DESC
      `,
      // Per-proposal, per-client vote weight breakdown (includes votes with no client)
      sql`
        SELECT v.proposal_id, v.client_id, COALESCE(SUM(v.votes), 0)::int as vote_count, c.name
        FROM ponder_live.votes v
        LEFT JOIN ponder_live.clients c ON v.client_id = c.client_id
        WHERE v.proposal_id = ANY(${proposalIds})
        GROUP BY v.proposal_id, v.client_id, c.name
        ORDER BY v.proposal_id, vote_count DESC
      `,
    ]);

    return NextResponse.json({
      votes: aggregateRows.map((r: any) => ({
        clientId: r.client_id ?? -1,
        name: r.name ?? 'No Client',
        voteCount: r.vote_count,
      })),
      votesByProposal: perProposalRows.map((r: any) => ({
        proposalId: r.proposal_id,
        clientId: r.client_id ?? -1,
        name: r.name ?? 'No Client',
        voteCount: r.vote_count,
      })),
    });
  } catch (error) {
    console.error('[API] Failed to fetch cycle votes:', error);
    return NextResponse.json({ error: 'Failed to fetch cycle votes' }, { status: 500 });
  }
}
