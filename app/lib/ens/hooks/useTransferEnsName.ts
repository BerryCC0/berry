/**
 * Transfer ownership of an ENS name.
 *
 * Three contracts can hold ownership depending on the name type:
 *   - 'registry':    standard ENS Registry (most non-wrapped names)
 *   - 'nameWrapper': wrapped names (ERC-1155)
 *   - 'registrar':   .eth 2LD ownership at the BaseRegistrar layer (ERC-721)
 *
 * The right contract depends on the name's current state. Use ensjs's
 * getOwner() to inspect before transferring; we don't pick automatically
 * because the caller usually knows which layer they're operating on.
 */

import { useCallback } from 'react';
import { transferName } from '@ensdomains/ensjs/wallet';
import type { Address } from 'viem';
import { ensEncoderClient } from '@/app/lib/ens/client';
import { useEnsWrite } from './useEnsWrite';

type TransferContract = 'registry' | 'nameWrapper' | 'registrar';

export function useTransferEnsName() {
  const w = useEnsWrite();
  const transfer = useCallback(
    async (params: {
      name: string;
      newOwnerAddress: Address;
      contract: TransferContract;
      reclaim?: boolean;
      asParent?: boolean;
    }) => {
      const tx = transferName.makeFunctionData(ensEncoderClient() as never, params as never);
      return w.execute(tx);
    },
    [w],
  );
  return { ...w, transfer };
}
