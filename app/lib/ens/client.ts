/**
 * Shared viem client with ENS contracts and actions installed.
 *
 * ENS reads always target Ethereum mainnet regardless of the wallet's active
 * chain, so we keep a single module-level client. Uses viem's fallback
 * transport across multiple public RPCs so one provider going down (e.g.
 * LlamaRPC's recurring outages) doesn't take down every on-chain ENS lookup.
 *
 * On the server, the broader app/lib/rpc.ts transport (with Alchemy as
 * primary) is preferred. This module is shared client+server, and ALCHEMY_API_KEY
 * isn't exposed to the browser, so we use public-only here.
 *
 * Writes still go through wagmi's useWriteContract — those need wallet
 * context. Only reads use this client.
 */

import { createPublicClient, fallback, http } from 'viem';
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

const TIMEOUT_MS = 8_000;

function buildTransport() {
  const transports = [];

  // Server-side: try Alchemy first if available. NEXT_PUBLIC_ wouldn't be
  // appropriate (key would leak), so this branch only fires inside API routes.
  const serverAlchemyKey =
    typeof process !== "undefined" && typeof window === "undefined"
      ? process.env.ALCHEMY_API_KEY
      : undefined;
  if (serverAlchemyKey) {
    transports.push(
      http(`https://eth-mainnet.g.alchemy.com/v2/${serverAlchemyKey}`, {
        timeout: TIMEOUT_MS,
      }),
    );
  }

  // Public fallbacks — fall through these in order if the primary is down.
  // Each has had outages at various times, so having multiple is the point.
  transports.push(
    http("https://ethereum-rpc.publicnode.com", { timeout: TIMEOUT_MS }),
    http("https://eth.llamarpc.com", { timeout: TIMEOUT_MS }),
  );

  return fallback(transports, { retryCount: 1 });
}

let _singleton: ReturnType<typeof buildSingleton> | null = null;

function buildSingleton() {
  return createPublicClient({
    chain: ensMainnet,
    transport: buildTransport(),
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
 * Alias for ensjs's `makeFunctionData` calls.
 *
 * Several ensjs encoders call `getChainContractAddress({ client, ... })`
 * which only needs `client.chain`. We use the same singleton publicClient
 * (it has `chain: ensMainnet`) so no separate stub is needed at runtime —
 * this export exists to make the encoder usage in write hooks explicit.
 */
export const ensEncoderClient = ensPublicClient;
