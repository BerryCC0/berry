/**
 * GET /api/proposals/[id]/canceller
 *
 * Resolves WHO cancelled a proposal. The DAO's `ProposalCanceled(uint256 id)`
 * event carries no actor, and the indexer doesn't store one — so we look up the
 * event log at the indexed `cancelled_block` and take the sender of the
 * transaction that emitted it.
 *
 * Kept as its own lazy route (rather than folding into /api/proposals/[id]) so
 * the hot proposal-detail path stays free of RPC calls — only cancelled
 * proposals ever trigger this.
 */

import { NextResponse } from 'next/server';
import { parseAbiItem } from 'viem';
import { ponderSql } from '@/app/lib/ponder-db';
import { getMainnetClient } from '@/app/lib/rpc';
import { NOUNS_CONTRACTS } from '@/app/lib/nouns/contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROPOSAL_CANCELED_EVENT = parseAbiItem('event ProposalCanceled(uint256 id)');

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const proposalId = parseInt(id, 10);
  if (!Number.isInteger(proposalId) || proposalId < 0) {
    return NextResponse.json({ error: 'Invalid proposal ID' }, { status: 400 });
  }

  try {
    const sql = ponderSql();
    const rows = await sql`
      SELECT p.status, p.cancelled_timestamp, p.cancelled_block
      FROM ponder_live.proposals p
      WHERE p.id = ${proposalId}
      LIMIT 1
    `;

    const row = rows[0];
    const cancelledTimestamp =
      row?.cancelled_timestamp != null ? String(row.cancelled_timestamp) : null;

    // Not cancelled, or we have no block to look at → nothing to resolve.
    if (!row || row.status !== 'CANCELLED' || row.cancelled_block == null) {
      return NextResponse.json({ canceller: null, cancelledTimestamp });
    }

    // Prefer the indexed canceller. `cancelled_by` only exists once the indexer
    // deployment that added it has synced, so a missing column is expected on
    // older deployments — fall through to the chain lookup in that case.
    try {
      const indexed = await sql`
        SELECT p.cancelled_by, p.cancelled_tx_hash
        FROM ponder_live.proposals p
        WHERE p.id = ${proposalId}
        LIMIT 1
      `;
      const cancelledBy = indexed[0]?.cancelled_by;
      if (cancelledBy) {
        return NextResponse.json({
          canceller: cancelledBy,
          txHash: indexed[0]?.cancelled_tx_hash ?? undefined,
          cancelledTimestamp,
          source: 'indexer',
        });
      }
    } catch {
      // Column not present yet — use the chain lookup below.
    }

    const blockNumber = BigInt(String(row.cancelled_block));
    const client = getMainnetClient();

    // ProposalCanceled has no indexed args, so pull the block's logs for this
    // event and match on the decoded id.
    const logs = await client.getLogs({
      address: NOUNS_CONTRACTS.governor.address,
      event: PROPOSAL_CANCELED_EVENT,
      fromBlock: blockNumber,
      toBlock: blockNumber,
    });

    const log = logs.find((l) => Number(l.args?.id) === proposalId);
    if (!log?.transactionHash) {
      return NextResponse.json({ canceller: null, cancelledTimestamp });
    }

    const tx = await client.getTransaction({ hash: log.transactionHash });

    return NextResponse.json({
      canceller: tx.from,
      txHash: log.transactionHash,
      cancelledTimestamp,
      source: 'chain',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
