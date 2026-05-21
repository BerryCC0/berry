/**
 * .eth name registration — 2-step commit/reveal flow.
 *
 * Why two steps: the commit phase hides the name being registered, so
 * miners/searchers can't front-run by registering the same name with
 * higher gas. After a minimum wait (default 60s, current contract enforces
 * up to ~24h max), `register()` reveals the secret and completes registration.
 *
 * Flow:
 *   1. const secret = randomSecret()
 *   2. commit({ name, owner, duration, secret, ... })  → wait 60s
 *   3. register({ ...same params, secret })             → name is yours
 *
 * Also exposes useRenewEnsName for extending an existing registration.
 */

import { useCallback } from 'react';
import { commitName, registerName, renewNames } from '@ensdomains/ensjs/wallet';
import { randomSecret } from '@ensdomains/ensjs/utils';
import type { Address, Hex } from 'viem';
import { ensEncoderClient } from '@/app/lib/ens/client';
import { useEnsWrite } from './useEnsWrite';

/** Minimum wait between commit and register, enforced on-chain. */
export const MIN_COMMITMENT_AGE_SECONDS = 60;

export interface RegisterParams {
  name: string;
  owner: Address;
  /** Registration duration in seconds (1 year = 31_536_000). */
  duration: number | bigint;
  /** 32-byte random secret — generate with randomSecret() and store across the wait. */
  secret: Hex;
  /** Optional resolver to set during registration (saves a separate tx). */
  resolverAddress?: Address;
  /** Calldata to execute on the resolver after registration (e.g. set addr/text). */
  records?: { key: string; value: string }[];
  /** Set this name as the registrant's primary name in the same tx. */
  reverseRecord?: boolean;
  /** Fuses to burn if using NameWrapper. */
  fuses?: number;
}

export { randomSecret };

export function useCommitEnsName() {
  const w = useEnsWrite();
  const commit = useCallback(
    async (params: RegisterParams) => {
      const tx = commitName.makeFunctionData(ensEncoderClient() as never, params as never);
      return w.execute(tx);
    },
    [w],
  );
  return { ...w, commit };
}

export function useRegisterEnsName() {
  const w = useEnsWrite();
  const register = useCallback(
    async (params: RegisterParams & { value: bigint }) => {
      const tx = registerName.makeFunctionData(ensEncoderClient() as never, params as never);
      return w.execute(tx);
    },
    [w],
  );
  return { ...w, register };
}

export function useRenewEnsName() {
  const w = useEnsWrite();
  const renew = useCallback(
    async (params: {
      nameOrNames: string | string[];
      duration: number | bigint;
      value: bigint;
      referrer?: Hex;
    }) => {
      const tx = renewNames.makeFunctionData(ensEncoderClient() as never, params);
      return w.execute(tx);
    },
    [w],
  );
  return { ...w, renew };
}
