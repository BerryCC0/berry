"use client";

/**
 * Persists an in-flight .eth registration commit across window closes.
 *
 * The 2-step register flow has a ≥60s wait between commit() and register().
 * If the user closes the Names window during that wait, the secret used to
 * compute the commitment is lost — they'd have to pay gas to commit again.
 *
 * We stash {fullName, owner, duration, secret, committedAt} in sessionStorage
 * keyed by wallet address. Survives window close and OS-level navigation
 * within the same tab. Cleared on successful register or explicit cancel.
 *
 * sessionStorage (not localStorage) intentionally: the secret is
 * single-use and shouldn't outlive the browser session.
 */

import { useCallback, useEffect, useState } from "react";
import type { Hex } from "viem";

export interface RegisterCommitSession {
  fullName: string;
  owner: Hex;
  duration: number;
  secret: Hex;
  /** Unix ms when the commit transaction was sent. */
  committedAt: number;
  /** Tx hash of the commit — handy for users wanting to verify on Etherscan. */
  commitTxHash?: Hex;
}

function storageKey(address: string | undefined): string | null {
  if (!address) return null;
  return `berry:ens:register:${address.toLowerCase()}`;
}

function load(address: string | undefined): RegisterCommitSession | null {
  const key = storageKey(address);
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RegisterCommitSession;
    if (!parsed.secret || !parsed.fullName || !parsed.committedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useRegisterCommitSession(address: string | undefined) {
  const [session, setSession] = useState<RegisterCommitSession | null>(null);

  // Hydrate from sessionStorage on mount or when address changes.
  useEffect(() => {
    setSession(load(address));
  }, [address]);

  const save = useCallback(
    (next: RegisterCommitSession) => {
      const key = storageKey(address);
      if (!key || typeof window === "undefined") return;
      try {
        window.sessionStorage.setItem(key, JSON.stringify(next));
        setSession(next);
      } catch {
        setSession(next);
      }
    },
    [address],
  );

  const clear = useCallback(() => {
    const key = storageKey(address);
    if (key && typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        /* noop */
      }
    }
    setSession(null);
  }, [address]);

  return { session, save, clear };
}
