/**
 * NameWrapper fuse management.
 *
 * Fuses are a permission bitfield burned onto wrapped names. Once burned,
 * they cannot be unburned — fuses make permissions *more* restrictive
 * permanently. They're the mechanism that makes NameWrapper subnames
 * truly trust-minimized (e.g. PARENT_CANNOT_CONTROL means the parent
 * can't revoke the subname anymore).
 *
 * `useSetFuses` burns fuses on the connected wallet's own wrapped name.
 * `useSetChildFuses` is the parent operating on a subname — used to
 * lock down a subname's fuses before giving it to someone else.
 *
 * Re-exports `ChildFuses`, `UserSettableFuses` and the key arrays so the
 * UI can render a checklist without needing to import from ensjs/utils
 * directly.
 */

import { useCallback } from "react";
import { setFuses, setChildFuses } from "@ensdomains/ensjs/wallet";
import { ensEncoderClient } from "@/app/lib/ens/client";
import { useEnsWrite } from "./useEnsWrite";

export {
  ChildFuses,
  ChildFuseKeys,
  ParentFuses,
  ParentFuseKeys,
  UserSettableFuses,
  UserSettableFuseKeys,
  decodeFuses,
  encodeFuses,
} from "@ensdomains/ensjs/utils";

export type FuseName =
  | "CANNOT_UNWRAP"
  | "CANNOT_BURN_FUSES"
  | "CANNOT_TRANSFER"
  | "CANNOT_SET_RESOLVER"
  | "CANNOT_SET_TTL"
  | "CANNOT_CREATE_SUBDOMAIN"
  | "CANNOT_APPROVE"
  | "PARENT_CANNOT_CONTROL";

/** Set fuses on a name you own (must be wrapped). */
export function useSetFuses() {
  const w = useEnsWrite();
  const setFusesFn = useCallback(
    async (params: {
      name: string;
      /** Array of fuse names to burn — combined into the bitfield internally. */
      fuses: FuseName[];
    }) => {
      const tx = setFuses.makeFunctionData(ensEncoderClient() as never, {
        name: params.name,
        fuses: { named: params.fuses as never },
      } as never);
      return w.execute(tx);
    },
    [w],
  );
  return { ...w, setFuses: setFusesFn };
}

/** Set fuses on a subname (you must own the parent). */
export function useSetChildFuses() {
  const w = useEnsWrite();
  const setChildFusesFn = useCallback(
    async (params: {
      name: string;
      fuses: FuseName[];
      /** Optional expiry override (NameWrapper enforces this). */
      expiry?: bigint;
    }) => {
      const tx = setChildFuses.makeFunctionData(
        ensEncoderClient() as never,
        {
          name: params.name,
          fuses: { named: params.fuses as never },
          expiry: params.expiry,
        } as never,
      );
      return w.execute(tx);
    },
    [w],
  );
  return { ...w, setChildFuses: setChildFusesFn };
}
