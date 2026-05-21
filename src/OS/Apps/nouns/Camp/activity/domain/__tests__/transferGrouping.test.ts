/**
 * Tests for the two-pass transfer grouping logic. Both passes have subtle
 * bugs available — the `consumed` Set indexing in pass 2, the time-window
 * break-out, the bulk-vs-single decision in pass 1.
 *
 * The autismcentral fixture in the bottom describe block is mentioned by
 * name in the legacy code at `useActivityFeed.ts:542-545` — preserving its
 * behavior was a stated correctness goal for the refactor.
 */

import { describe, it, expect } from 'vitest';
import { groupTransfers } from '../transferGrouping';
import type { ActivityItem } from '../../../types';

/** Helper: build a single-transfer item with sensible defaults. */
function transfer(over: {
  nounId: string;
  from: string;
  to: string;
  ts: string | number;
  tx?: string;
}): ActivityItem {
  return {
    id: `transfer-${over.nounId}-${over.ts}`,
    type: 'noun_transfer',
    timestamp: String(over.ts),
    actor: over.from,
    nounId: over.nounId,
    fromAddress: over.from,
    toAddress: over.to,
    txHash: over.tx,
  };
}

describe('groupTransfers — pass 1 (single-tx multi-noun)', () => {
  it('passes singletons through unchanged', () => {
    const input = [transfer({ nounId: '1', from: '0xA', to: '0xB', ts: 100, tx: '0xT1' })];
    const out = groupTransfers(input);
    expect(out).toHaveLength(1);
    expect(out[0].isBulkTransfer).toBeUndefined();
    expect(out[0].nounId).toBe('1');
  });

  it('merges two transfers with same txHash + buyer into one bulk item', () => {
    const input = [
      transfer({ nounId: '1', from: '0xA', to: '0xB', ts: 100, tx: '0xT1' }),
      transfer({ nounId: '2', from: '0xA', to: '0xB', ts: 100, tx: '0xT1' }),
    ];
    const out = groupTransfers(input);
    expect(out).toHaveLength(1);
    expect(out[0].isBulkTransfer).toBe(true);
    expect(out[0].nounIds).toEqual(['1', '2']);
    expect(out[0].id).toBe('bulk-transfer-0xT1');
  });

  it('does NOT merge transfers with same tx but different buyers', () => {
    const input = [
      transfer({ nounId: '1', from: '0xA', to: '0xB', ts: 100, tx: '0xT1' }),
      transfer({ nounId: '2', from: '0xA', to: '0xC', ts: 100, tx: '0xT1' }),
    ];
    const out = groupTransfers(input);
    expect(out).toHaveLength(2);
    expect(out.every((i) => !i.isBulkTransfer)).toBe(true);
  });

  it('transfers without txHash pass through ungrouped', () => {
    const input = [
      transfer({ nounId: '1', from: '0xA', to: '0xB', ts: 100 }),
      transfer({ nounId: '2', from: '0xA', to: '0xB', ts: 100 }),
    ];
    const out = groupTransfers(input);
    // Both lack txHash → ungrouped. Pass 2 may still cluster them within
    // the 1hr window since they share (from, to). Verify behavior is
    // "merged into bulk-pair" since they're at the same instant.
    expect(out).toHaveLength(1);
    expect(out[0].isBulkTransfer).toBe(true);
  });
});

describe('groupTransfers — pass 2 (same-pair within 1hr)', () => {
  it('merges two same-pair transfers across different txs within 1hr', () => {
    const input = [
      transfer({ nounId: '1', from: '0xA', to: '0xB', ts: 100, tx: '0xT1' }),
      transfer({ nounId: '2', from: '0xA', to: '0xB', ts: 3000, tx: '0xT2' }),
    ];
    const out = groupTransfers(input);
    expect(out).toHaveLength(1);
    expect(out[0].isBulkTransfer).toBe(true);
    expect(out[0].nounIds?.sort()).toEqual(['1', '2']);
    expect(out[0].id).toMatch(/^bulk-pair-/);
  });

  it('does NOT merge same-pair transfers beyond 1hr', () => {
    const input = [
      transfer({ nounId: '1', from: '0xA', to: '0xB', ts: 100, tx: '0xT1' }),
      transfer({ nounId: '2', from: '0xA', to: '0xB', ts: 100 + 3601, tx: '0xT2' }),
    ];
    const out = groupTransfers(input);
    expect(out).toHaveLength(2);
  });

  it('boundary: exactly 1hr apart counts as same-pair (<=, not <)', () => {
    const input = [
      transfer({ nounId: '1', from: '0xA', to: '0xB', ts: 100, tx: '0xT1' }),
      transfer({ nounId: '2', from: '0xA', to: '0xB', ts: 100 + 3600, tx: '0xT2' }),
    ];
    const out = groupTransfers(input);
    expect(out).toHaveLength(1);
    expect(out[0].isBulkTransfer).toBe(true);
  });

  it('different pairs in the same window do not merge', () => {
    const input = [
      transfer({ nounId: '1', from: '0xA', to: '0xB', ts: 100, tx: '0xT1' }),
      transfer({ nounId: '2', from: '0xC', to: '0xD', ts: 200, tx: '0xT2' }),
    ];
    const out = groupTransfers(input);
    expect(out).toHaveLength(2);
  });
});

describe('groupTransfers — autismcentral fixture (legacy comment, useActivityFeed.ts:542-545)', () => {
  it('clusters bid.autismcentral → vault.autismcentral across 4 txs within 1hr', () => {
    // 4 separate txs, same from→to, within 30 minutes of each other.
    const FROM = '0xbid_autismcentral';
    const TO = '0xvault_autismcentral';
    const input = [
      transfer({ nounId: '1619', from: FROM, to: TO, ts: 1000, tx: '0xtx1' }),
      transfer({ nounId: '1732', from: FROM, to: TO, ts: 1500, tx: '0xtx2' }),
      transfer({ nounId: '1762', from: FROM, to: TO, ts: 2000, tx: '0xtx3' }),
      transfer({ nounId: '1811', from: FROM, to: TO, ts: 2500, tx: '0xtx4' }),
    ];
    const out = groupTransfers(input);
    expect(out).toHaveLength(1);
    expect(out[0].isBulkTransfer).toBe(true);
    // Note: pass 2 clusters in timestamp ASC order, so the nounIds order
    // matches input order after sort.
    expect(out[0].nounIds).toEqual(['1619', '1732', '1762', '1811']);
    // Bulk item uses latest timestamp.
    expect(out[0].timestamp).toBe('2500');
    // Actor = sender for pair-clustered items (legacy behavior).
    expect(out[0].actor).toBe(FROM);
  });
});
