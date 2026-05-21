/**
 * Set the connected wallet's primary ENS name (reverse record).
 *
 * Calls ReverseRegistrar.setName(name). The contract uses msg.sender for
 * the owner, so we don't need to pass an address — the wallet's account
 * is implicit.
 *
 * For setting the primary name on a *different* address (admin case),
 * use the lower-level setPrimaryName via useEnsWrite with an `address` arg.
 */

import { useCallback } from 'react';
import { setPrimaryName } from '@ensdomains/ensjs/wallet';
import { ensEncoderClient } from '@/app/lib/ens/client';
import { useEnsWrite } from './useEnsWrite';

export function useSetPrimaryName() {
  const w = useEnsWrite();
  const setPrimary = useCallback(
    async (name: string) => {
      const tx = setPrimaryName.makeFunctionData(ensEncoderClient() as never, { name });
      return w.execute(tx);
    },
    [w],
  );
  return { ...w, setPrimary };
}
