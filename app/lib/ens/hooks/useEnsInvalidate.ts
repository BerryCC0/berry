"use client";

/**
 * Invalidate ENS-related React Query caches after a write.
 *
 * Every ENS hook uses query keys starting with `["ens", ...]`. Writes
 * (record updates, primary name changes, transfers, subname creation,
 * fuse burns) should call the appropriate invalidate to keep the UI
 * coherent with on-chain state.
 *
 * Usage:
 *   const invalidate = useEnsInvalidate();
 *   await setText({ name, key, value });
 *   invalidate.name(name);  // refetches everything touching this name
 *
 * If you don't know what to invalidate, call `invalidate.all()`.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export function useEnsInvalidate() {
  const qc = useQueryClient();

  const all = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["ens"] });
  }, [qc]);

  /** Invalidate every query whose key contains this name. */
  const name = useCallback(
    (ensName: string) => {
      qc.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === "ens" &&
          q.queryKey.includes(ensName),
      });
    },
    [qc],
  );

  /** Invalidate every query whose key contains this address (lowercased). */
  const address = useCallback(
    (addr: string) => {
      const lower = addr.toLowerCase();
      qc.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === "ens" &&
          q.queryKey.some((k) => typeof k === "string" && k.toLowerCase() === lower),
      });
    },
    [qc],
  );

  return { all, name, address };
}
