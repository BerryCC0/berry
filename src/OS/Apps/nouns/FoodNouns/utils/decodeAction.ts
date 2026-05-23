/**
 * Decode a Food Nouns proposal action into a human-readable shape.
 *
 * FN is a V1 GovernorBravo fork whose actions are forwarded through the
 * timelock. In practice that means actions fall into two buckets:
 *   • Plain ETH transfer — signature empty, calldata "0x", value > 0
 *   • Generic contract call — signature is the ABI signature (e.g.
 *     "transfer(address,uint256)") and calldata is ABI-encoded args.
 *
 * We don't try to fully ABI-decode arbitrary calls (Camp leans on a
 * Nouns-specific decoder for that). Instead we surface the function
 * signature + target so the action becomes legible at a glance and
 * power-users can still inspect raw calldata.
 */
import { formatEther } from 'viem';
import type { FNProposalAction } from '../hooks/useFNProposal';

export type DecodedAction =
  | { kind: 'eth-transfer'; recipient: `0x${string}`; valueWei: bigint; valueEth: string }
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
