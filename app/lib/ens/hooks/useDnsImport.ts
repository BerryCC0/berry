/**
 * Import a DNS name (e.g. nounsfoundation.org) into ENS.
 *
 * Two flavors of DNS → ENS exist:
 *
 *   1. **Gasless** — add a TXT record at the apex pointing at an offchain
 *      resolver (ENS1 ExtendedDNSResolver + ETH address). Resolution
 *      happens via CCIP-Read at query time; no transaction needed.
 *      For this path, no import — the TXT record IS the configuration.
 *
 *   2. **Onchain** — submit a DNSSEC proof to DNSRegistrar. Costs gas
 *      (~1-3M) but registers the name in ENS Registry, enabling subnames,
 *      transfer, and full resolver flexibility.
 *
 * This hook covers path 2. The proof is fetched offchain (DNS query +
 * DNSSEC validation) then submitted onchain.
 *
 * Path 1 doesn't need a hook — it's purely DNS configuration. The UI
 * for it shows the TXT record string to add at the user's registrar.
 */

import { useCallback, useState } from 'react';
import { getDnsImportData, importDnsName } from '@ensdomains/ensjs/dns';
import { ensEncoderClient, ensPublicClient } from '@/app/lib/ens/client';
import type { Address } from 'viem';
import { useEnsWrite } from './useEnsWrite';

/**
 * Fetch the DNSSEC proof and other import data for a DNS name.
 * The proof must be re-fetched if too much time elapses between
 * fetch and submission (DNSSEC signatures have inception/expiration).
 */
export function useDnsImportData() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getDnsImportData>> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async (name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getDnsImportData(ensPublicClient(), { name });
      setData(result);
      return result;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { fetch, data, isLoading, error, reset };
}

/**
 * Submit a previously fetched proof to DNSRegistrar.
 * Optionally set a resolver + addr in the same transaction
 * (proveAndClaimWithResolver path) — saves a follow-up tx.
 */
export function useImportDnsName() {
  const w = useEnsWrite();
  const importName = useCallback(
    async (params: {
      name: string;
      dnsImportData: Awaited<ReturnType<typeof getDnsImportData>>;
      resolverAddress?: Address;
      address?: Address;
    }) => {
      const tx = importDnsName.makeFunctionData(ensEncoderClient() as never, params as never);
      return w.execute(tx);
    },
    [w],
  );
  return { ...w, importName };
}
