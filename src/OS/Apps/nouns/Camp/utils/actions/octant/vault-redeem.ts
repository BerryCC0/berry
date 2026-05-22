/**
 * octant-vault-redeem — ERC-4626 `redeem(shares, receiver, owner)`.
 * Shares are 18-decimal by ERC-4626 convention. Receiver and owner are both
 * the treasury (the only address authorising this proposal).
 */

import { encodeAbiParameters, parseAbiParameters, parseUnits, type Address } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  addressEquals,
  decodeArgs,
  formatTokenAmount,
  matchSignature,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  vault: string;
  shares: string;
}

const SIG = 'redeem(uint256,address,address)';
const TREASURY = NOUNS_ADDRESSES.treasury as Address;

export const octantVaultRedeem: TransactionActionDef<Fields> = {
  id: 'octant-vault-redeem',
  category: 'octant',
  name: 'Redeem from Octant Vault',
  description: 'Redeem vault shares back to underlying assets (ERC-4626 redeem)',
  isMultiAction: false,
  fields: [
    { name: 'vault', label: 'Vault Address', type: 'address', required: true },
    { name: 'shares', label: 'Shares', type: 'amount', required: true },
  ],

  encode(values) {
    const shares = parseUnits(values.shares || '0', 18);
    return [
      {
        target: values.vault as Address,
        value: '0',
        signature: SIG,
        calldata: encodeAbiParameters(
          parseAbiParameters('uint256, address, address'),
          [shares, TREASURY, TREASURY],
        ),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!matchSignature(action, SIG)) return null;
    const args = decodeArgs<readonly [bigint, Address, Address]>(
      action.calldata,
      'uint256, address, address',
    );
    if (!args) return null;
    // Both receiver and owner must be the treasury.
    if (!addressEquals(args[1], TREASURY)) return null;
    if (!addressEquals(args[2], TREASURY)) return null;
    return {
      values: {
        vault: action.target,
        shares: formatTokenAmount(args[0], 18),
      },
      consumed: 1,
    };
  },

  describe(values) {
    return [
      {
        title: `Redeem ${values.shares} shares from Octant vault`,
        functionName: 'redeem',
        params: { vault: values.vault, shares: values.shares },
      },
    ];
  },
};
