/**
 * octant-vault-withdraw — ERC-4626 `withdraw(assets, receiver, owner)`.
 * Same 3-slot layout as redeem; differs in that `assets` is in underlying
 * units rather than vault shares.
 *
 * Without the vault's underlying-asset metadata we can't infer decimals from
 * calldata alone — round-trip uses the editor-supplied `token` field hint
 * (which the legacy template also stored separately from the calldata).
 */

import { encodeAbiParameters, parseAbiParameters, parseUnits, type Address } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import { COMMON_TOKENS } from '../../actionTemplates/constants';
import {
  addressEquals,
  decodeArgs,
  formatTokenAmount,
  matchSignature,
  parseTokenSelectValue,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  vault: string;
  token: string;
  amount: string;
}

const SIG = 'withdraw(uint256,address,address)';
const TREASURY = NOUNS_ADDRESSES.treasury as Address;

export const octantVaultWithdraw: TransactionActionDef<Fields> = {
  id: 'octant-vault-withdraw',
  category: 'octant',
  name: 'Withdraw from Octant Vault',
  description:
    "Withdraw a specific amount of the underlying asset from an Octant vault",
  isMultiAction: false,
  fields: [
    { name: 'vault', label: 'Vault Address', type: 'address', required: true },
    { name: 'token', label: 'Underlying Asset', type: 'token-select', required: true },
    { name: 'amount', label: 'Amount', type: 'amount', required: true },
  ],

  encode(values) {
    const token = parseTokenSelectValue(values.token, COMMON_TOKENS);
    const decimals = token?.decimals ?? 18;
    const assets = parseUnits(values.amount || '0', decimals);
    return [
      {
        target: values.vault as Address,
        value: '0',
        signature: SIG,
        calldata: encodeAbiParameters(
          parseAbiParameters('uint256, address, address'),
          [assets, TREASURY, TREASURY],
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
    if (!addressEquals(args[1], TREASURY)) return null;
    if (!addressEquals(args[2], TREASURY)) return null;
    // Legacy default: assume 18-decimal underlying. The editor's `token`
    // field can correct this on the next edit; we just have to round-trip
    // SOMETHING that re-encodes identically.
    return {
      values: {
        vault: action.target,
        token: '',
        amount: formatTokenAmount(args[0], 18),
      },
      consumed: 1,
    };
  },

  describe(values) {
    const token = parseTokenSelectValue(values.token);
    return [
      {
        title: `Withdraw ${values.amount} ${token?.symbol ?? 'assets'} from Octant vault`,
        functionName: 'withdraw',
        params: { vault: values.vault, amount: values.amount },
      },
    ];
  },
};
