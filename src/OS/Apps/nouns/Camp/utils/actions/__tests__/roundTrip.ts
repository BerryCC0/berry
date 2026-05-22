/**
 * Round-trip test helper. Pattern that every action's __tests__/<id>.test.ts
 * should reuse: encode → decode → encode produces identical actions. Catches
 * encoder bugs AND drift between encode/decode for the same action def.
 */

import { expect } from 'vitest';
import type {
  DecodeContext,
  EncodeContext,
  ProposalAction,
  TransactionActionDef,
} from '../types';

export function emptyDecodeContext(): DecodeContext {
  return {
    streamAddresses: new Set(),
    cancelledStreams: new Set(),
    streams: new Map(),
    tokens: new Map(),
  };
}

export function emptyEncodeContext(): EncodeContext {
  return {};
}

/**
 * Assert that encoding the given fields, decoding the result, and re-encoding
 * produces the same set of on-chain actions. Optionally check that the
 * decoded fields match the input (modulo string formatting — display amounts
 * are normalised to trim trailing zeros, so the input must use the same
 * normalisation, or pass `expectedDecodedFields` explicitly).
 */
export function assertRoundTrip<TFields>(
  def: TransactionActionDef<TFields>,
  fields: TFields,
  opts?: { expectedDecodedFields?: TFields },
): void {
  const ctx = emptyEncodeContext();
  const dctx = emptyDecodeContext();

  // First encode — what would go on-chain if the proposer hit submit.
  const firstEncode = def.encode(fields, ctx);
  expect(firstEncode.length).toBeGreaterThan(0);

  // Decode at cursor 0. Must match (this is the action def's own output).
  const match = def.decode(firstEncode, 0, dctx);
  expect(match).not.toBeNull();
  if (!match) return;
  expect(match.consumed).toBe(firstEncode.length);

  if (opts?.expectedDecodedFields !== undefined) {
    expect(match.values).toEqual(opts.expectedDecodedFields);
  }

  // Re-encode from the decoded fields. Must produce byte-identical actions.
  const secondEncode = def.encode(match.values as TFields, ctx);
  expect(secondEncode).toEqual(firstEncode);
}

/**
 * Assert that this action def does NOT match the given actions at cursor 0.
 * Useful for negative tests — confirming an action def doesn't over-eagerly
 * claim actions that belong to a different domain.
 */
export function assertNoMatch<TFields>(
  def: TransactionActionDef<TFields>,
  actions: ProposalAction[],
): void {
  const dctx = emptyDecodeContext();
  const match = def.decode(actions, 0, dctx);
  expect(match).toBeNull();
}
