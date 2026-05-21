/**
 * Shared viem client with ENS contracts and actions installed.
 *
 * ENS reads always target Ethereum mainnet regardless of the wallet's active
 * chain, so we keep a single module-level client rather than decorating
 * wagmi's per-chain publicClient (which doesn't carry the ChainWithEns type).
 *
 * Writes still go through wagmi's useWriteContract — those need wallet
 * context. Only reads use this client.
 */

import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { addEnsContracts, ensPublicActions } from '@ensdomains/ensjs';

// `getNamesForAddress` is the only ensjs function that touches The Graph —
// and we replaced it with our own Ponder-indexed /api/ens/names-for-address
// route. So no subgraph API key is required for normal operation. If we
// later need other ensjs subgraph reads, set NEXT_PUBLIC_ENS_SUBGRAPH_API_KEY
// and they'll start working.
const subgraphApiKey = process.env.NEXT_PUBLIC_ENS_SUBGRAPH_API_KEY;

export const ensMainnet = addEnsContracts(mainnet, subgraphApiKey ? { subgraphApiKey } : undefined);

const PUBLIC_RPC = 'https://eth.llamarpc.com';

let _singleton: ReturnType<typeof buildSingleton> | null = null;

function buildSingleton() {
  return createPublicClient({
    chain: ensMainnet,
    transport: http(PUBLIC_RPC),
  }).extend(ensPublicActions);
}

export function ensPublicClient() {
  if (!_singleton) _singleton = buildSingleton();
  return _singleton;
}

/** Hook form for components — currently a thin wrapper, may diverge later. */
export function useEnsClient() {
  return ensPublicClient();
}

/**
 * Minimal client stub for ensjs's `makeFunctionData` calls.
 *
 * Several ensjs encoders call `getChainContractAddress({ client, ... })`
 * which only needs `client.chain`. We use the same singleton publicClient
 * (it has `chain: ensMainnet`) so no separate stub is needed at runtime —
 * this export exists to make the encoder usage in write hooks explicit.
 */
export const ensEncoderClient = ensPublicClient;
