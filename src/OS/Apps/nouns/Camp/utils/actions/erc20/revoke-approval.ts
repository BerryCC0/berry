/**
 * erc20-revoke-approval — `approve(spender, 0)`. Same calldata shape as
 * erc20-approve with the amount field zeroed out. Distinguished from
 * erc20-approve by the zero amount; erc20-approve's decoder rejects zero
 * so the two never overlap.
 */

import { type Address, encodeAbiParameters, parseAbiParameters } from 'viem';
import { COMMON_TOKENS } from '../../actionTemplates/constants';
import {
  addressEquals,
  decodeArgs,
  matchSignature,
  parseTokenSelectValue,
  stringifyTokenSelectValue,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  token: string;
  spender: string;
}

const APPROVE_SIG = 'approve(address,uint256)';

export const erc20RevokeApproval: TransactionActionDef<Fields> = {
  id: 'erc20-revoke-approval',
  category: 'erc20',
  name: 'Revoke ERC-20 Approval',
  description:
    'Set an existing token allowance to zero — security hygiene for retired or compromised spenders',
  isMultiAction: false,
  fields: [
    { name: 'token', label: 'Token', type: 'treasury-token-select', required: true },
    { name: 'spender', label: 'Spender to revoke', type: 'address', required: true },
  ],

  encode(values) {
    const token = parseTokenSelectValue(values.token, COMMON_TOKENS);
    if (!token) throw new Error('erc20-revoke-approval: invalid token');
    return [
      {
        target: token.address,
        value: '0',
        signature: APPROVE_SIG,
        calldata: encodeAbiParameters(parseAbiParameters('address, uint256'), [
          values.spender as Address,
          BigInt(0),
        ]),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!matchSignature(action, APPROVE_SIG)) return null;
    const args = decodeArgs<readonly [Address, bigint]>(
      action.calldata,
      'address, uint256',
    );
    if (!args) return null;
    if (args[1] !== BigInt(0)) return null;

    const tokenAddress = action.target as Address;
    const knownToken = COMMON_TOKENS.find((t) =>
      addressEquals(t.address, tokenAddress),
    );
    return {
      values: {
        token: stringifyTokenSelectValue({
          symbol: knownToken?.symbol ?? tokenAddress,
          address: tokenAddress,
          decimals: knownToken?.decimals ?? 18,
          isNative: false,
        }),
        spender: args[0],
      },
      consumed: 1,
    };
  },

  describe(values) {
    const token = parseTokenSelectValue(values.token);
    return [
      {
        title: `Revoke ${token?.symbol ?? 'token'} approval`,
        description: `for ${values.spender}`,
        functionName: 'approve',
        params: { spender: values.spender, amount: '0' },
      },
    ];
  },
};
