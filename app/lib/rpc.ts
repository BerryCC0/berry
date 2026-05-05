/**
 * Shared mainnet RPC client with automatic failover.
 *
 * Tries Alchemy first when ALCHEMY_API_KEY is set, then falls back through
 * free public RPCs. If Alchemy is paused, rate-limited, or otherwise failing,
 * viem's fallback transport transparently routes to the next provider.
 */

import { createPublicClient, fallback, http, type FallbackTransport } from 'viem';
import { mainnet } from 'viem/chains';

const TIMEOUT_MS = 8_000;

export function mainnetTransport(): FallbackTransport {
  const transports = [];

  if (process.env.ALCHEMY_API_KEY) {
    transports.push(
      http(`https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`, {
        timeout: TIMEOUT_MS,
      })
    );
  }

  transports.push(
    http('https://ethereum-rpc.publicnode.com', { timeout: TIMEOUT_MS }),
    http('https://eth.llamarpc.com', { timeout: TIMEOUT_MS }),
    http('https://rpc.ankr.com/eth', { timeout: TIMEOUT_MS })
  );

  return fallback(transports, { retryCount: 1 });
}

export function getMainnetClient() {
  return createPublicClient({
    chain: mainnet,
    transport: mainnetTransport(),
  });
}

/**
 * Returns RPC URLs that support trace_transaction.
 * Currently Alchemy is the only reliable free-tier option in this list — most
 * public RPCs reject trace methods. Callers should treat trace_transaction as
 * best-effort and degrade gracefully when it fails.
 */
export function traceCapableRpcUrls(): string[] {
  const urls: string[] = [];
  if (process.env.ALCHEMY_API_KEY) {
    urls.push(`https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);
  }
  return urls;
}
