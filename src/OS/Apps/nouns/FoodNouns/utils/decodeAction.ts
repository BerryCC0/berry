/**
 * Decode a Food Nouns proposal action into a human-readable shape.
 *
 * Dispatch order:
 *   1. Plain ETH transfer (no signature, no calldata, value > 0)
 *   2. Known typed action via the FN action registry (admin setters,
 *      pause/unpause, etc.) — matched by exact (target, signature)
 *   3. Generic contract call (signature is set, e.g. transfer(address,uint256))
 *   4. Raw call (signature empty, calldata non-empty)
 *
 * The "known" kind preserves the action def + its decoded form values so
 * the detail view can render the def's friendly `describe()` line. The
 * generic kinds remain the fallback for anything not in the registry.
 */
import { formatEther } from 'viem';
import type { FNProposalAction } from '../hooks/useFNProposal';
import { FN_ACTION_DEFS, type FNActionDef } from './proposalActions';

// Registry defs that participate in the dispatch above. ETH transfer is
// handled specifically (we already have a richer 'eth-transfer' kind),
// and custom-call would claim every action so it must be excluded.
const TYPED_DEFS: readonly FNActionDef[] = FN_ACTION_DEFS.filter(
  (d) => d.id !== 'eth-transfer' && d.id !== 'custom-call',
);

export type DecodedAction =
  | { kind: 'eth-transfer'; recipient: `0x${string}`; valueWei: bigint; valueEth: string }
  | {
      kind: 'known';
      def: FNActionDef;
      values: Record<string, string>;
      target: `0x${string}`;
      valueWei: bigint;
      signature: string;
      calldata: string;
    }
  | { kind: 'contract-call'; target: `0x${string}`; signature: string; valueWei: bigint; calldata: string }
  | { kind: 'raw-call'; target: `0x${string}`; valueWei: bigint; calldata: string };

export function decodeAction(action: FNProposalAction): DecodedAction {
  const hasCalldata = !!action.calldata && action.calldata !== '0x';
  const hasSig = !!action.signature && action.signature.length > 0;

  if (!hasSig && !hasCalldata) {
    return {
      kind: 'eth-transfer',
      recipient: action.target,
      valueWei: action.value,
      valueEth: formatEther(action.value),
    };
  }

  // Try every typed def in registry order. Defs key off (target, signature)
  // so collisions are impossible — the first match is the right match.
  for (const def of TYPED_DEFS) {
    const values = def.decode({
      target: action.target,
      value: action.value,
      signature: action.signature,
      calldata: action.calldata as `0x${string}`,
    });
    if (values) {
      return {
        kind: 'known',
        def,
        values,
        target: action.target,
        valueWei: action.value,
        signature: action.signature,
        calldata: action.calldata,
      };
    }
  }

  if (hasSig) {
    return {
      kind: 'contract-call',
      target: action.target,
      signature: action.signature,
      valueWei: action.value,
      calldata: action.calldata,
    };
  }

  return {
    kind: 'raw-call',
    target: action.target,
    valueWei: action.value,
    calldata: action.calldata,
  };
}

/**
 * Aggregated, one-line summary of a list of actions — used in the
 * "Requesting X" pill at the top of the proposal view.
 *
 * Returns null when there are no actions to summarize.
 */
export function summarizeActions(actions: FNProposalAction[]): { headline: string; lines: string[] } | null {
  if (actions.length === 0) return null;

  let ethTotalWei = BigInt(0);
  let ethCount = 0;
  let callCount = 0;

  for (const a of actions) {
    const decoded = decodeAction(a);
    if (decoded.kind === 'eth-transfer') {
      ethTotalWei += decoded.valueWei;
      ethCount += 1;
    } else {
      // 'known' (admin setters, pause/unpause), 'contract-call', and
      // 'raw-call' are all "contract calls" for summary purposes. Any
      // ETH value forwarded with the call still contributes to the total.
      callCount += 1;
      if (decoded.valueWei > BigInt(0)) ethTotalWei += decoded.valueWei;
    }
  }

  const lines: string[] = [];
  if (ethTotalWei > BigInt(0)) {
    const eth = formatEther(ethTotalWei);
    const transfersLabel = ethCount > 1 ? ` (${ethCount} transfers)` : '';
    lines.push(`Requesting ${eth} ETH${transfersLabel}`);
  }
  if (callCount > 0) {
    lines.push(`${callCount} contract call${callCount > 1 ? 's' : ''}`);
  }

  // Pick the "main" line as the headline — ETH transfers take priority since
  // they're the most-common FN action.
  const headline = lines[0] ?? `${actions.length} on-chain action${actions.length > 1 ? 's' : ''}`;

  return { headline, lines };
}
