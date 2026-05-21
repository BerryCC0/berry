/**
 * Subname creation and deletion.
 *
 * Subnames can live in two contracts:
 *   - 'registry': classic ENS — owner alone controls, parent can revoke
 *   - 'nameWrapper': wrapped — supports expiry, fuses, and revocability of
 *     parent control (PARENT_CANNOT_CONTROL fuse). Most modern UX uses
 *     this so subname holders get NFT-style ownership guarantees.
 *
 * The parent name must be wrapped to create wrapped subnames.
 */

import { useCallback } from "react";
import { createSubname, deleteSubname } from "@ensdomains/ensjs/wallet";
import type { Address } from "viem";
import type { EncodeFusesInputObject } from "@ensdomains/ensjs/utils";
import { ensEncoderClient } from "@/app/lib/ens/client";
import { useEnsWrite } from "./useEnsWrite";

type SubnameContract = "registry" | "nameWrapper";

export function useCreateSubname() {
  const w = useEnsWrite();
  const create = useCallback(
    async (params: {
      /** Full subname to create, e.g. "alice.iwylie.eth". */
      name: string;
      owner: Address;
      contract: SubnameContract;
      resolverAddress?: Address;
      /** NameWrapper only. Defaults to parent expiry if omitted. */
      expiry?: number | bigint | Date;
      /** NameWrapper only. */
      fuses?: EncodeFusesInputObject;
    }) => {
      const tx = createSubname.makeFunctionData(
        ensEncoderClient() as never,
        params as never,
      );
      return w.execute(tx);
    },
    [w],
  );
  return { ...w, create };
}

export function useDeleteSubname() {
  const w = useEnsWrite();
  const remove = useCallback(
    async (params: {
      name: string;
      contract: SubnameContract;
      /** Required for wrapped names — the wrapped subname's owner. */
      asOwner?: boolean;
    }) => {
      const tx = deleteSubname.makeFunctionData(
        ensEncoderClient() as never,
        params as never,
      );
      return w.execute(tx);
    },
    [w],
  );
  return { ...w, remove };
}
