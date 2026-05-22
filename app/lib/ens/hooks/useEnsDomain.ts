/**
 * Read the full state for an ENS name via on-chain calls.
 *
 * Was previously backed by our Ponder-indexed ens_domains table; reverted
 * to live on-chain reads in favor of removing 15+ GB of indexer overhead.
 *
 * Composes:
 *   - getOwner (Registry)
 *   - getResolver (Registry)
 *   - getExpiry (BaseRegistrar / NameWrapper)
 *   - getWrapperData (NameWrapper — gives fuses + wrapped owner if wrapped)
 *
 * Returns null while loading or if the name doesn't exist on-chain.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOwner, getResolver, getExpiry, getWrapperData } from "@ensdomains/ensjs/public";
import { ensPublicClient } from "@/app/lib/ens/client";

export interface EnsDomain {
  node: string;
  name: string | null;
  label: string | null;
  parent: string | null;
  owner: string | null;
  registrant: string | null;
  wrappedOwner: string | null;
  resolver: string | null;
  /** bigint as string (seconds since epoch). */
  expiry: string | null;
  isWrapped: boolean;
  /** NameWrapper fuse bitfield. */
  fuses: number | null;
}

export function useEnsDomain(name: string | undefined) {
  const enabled = !!name && name.includes(".");

  const ownerQ = useQuery({
    queryKey: ["ens", "domain", "owner", name],
    queryFn: () => getOwner(ensPublicClient(), { name: name! }),
    enabled,
    staleTime: 30_000,
  });

  const resolverQ = useQuery({
    queryKey: ["ens", "domain", "resolver", name],
    queryFn: () => getResolver(ensPublicClient(), { name: name! }),
    enabled,
    staleTime: 30_000,
  });

  const expiryQ = useQuery({
    queryKey: ["ens", "domain", "expiry", name],
    queryFn: () => getExpiry(ensPublicClient(), { name: name! }),
    enabled: enabled && (name?.endsWith(".eth") ?? false),
    staleTime: 30_000,
  });

  const wrapperQ = useQuery({
    queryKey: ["ens", "domain", "wrapper", name],
    queryFn: () => getWrapperData(ensPublicClient(), { name: name! }),
    enabled,
    staleTime: 30_000,
  });

  const data = useMemo<EnsDomain | null>(() => {
    if (!name || (!ownerQ.data && !wrapperQ.data && !expiryQ.data)) return null;

    const isWrapped = !!wrapperQ.data;
    const wrappedOwner = wrapperQ.data?.owner ?? null;
    const fuses = wrapperQ.data?.fuses?.value ?? null;
    const expiryFromWrapper = wrapperQ.data?.expiry?.value;
    const expiryFromRegistrar = expiryQ.data?.expiry?.value;
    const expiry = expiryFromRegistrar ?? expiryFromWrapper ?? null;

    return {
      node: "",
      name,
      label: null,
      parent: null,
      owner: (ownerQ.data?.owner as string | null) ?? null,
      registrant: (ownerQ.data?.registrant as string | null) ?? null,
      wrappedOwner,
      resolver: (resolverQ.data as string | null) ?? null,
      expiry: expiry !== null && expiry !== undefined ? String(expiry) : null,
      isWrapped,
      fuses: typeof fuses === "number" ? fuses : null,
    };
  }, [name, ownerQ.data, resolverQ.data, expiryQ.data, wrapperQ.data]);

  return {
    data,
    isLoading: ownerQ.isLoading || resolverQ.isLoading || expiryQ.isLoading || wrapperQ.isLoading,
    error: ownerQ.error || resolverQ.error || expiryQ.error || wrapperQ.error,
  };
}
