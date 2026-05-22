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

// ENS subgraph API key — server-side only. Used by /api/ens/names-for-address
// and /api/ens/subnames routes, which proxy subgraph queries so the key
// never reaches the browser. Free tier (~100k queries/mo) covers Berry's
// traffic easily.
//
// NOT prefixed with NEXT_PUBLIC_ — bundling this into client JS would let
// anyone extract it and burn through quota.
const subgraphApiKey = typeof process !== "undefined" ? process.env.ENS_SUBGRAPH_API_KEY : undefined;

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
