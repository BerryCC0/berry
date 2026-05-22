/**
 * erc20-approve — `approve(spender, amount)` on any ERC-20.
 *
 * MUST be registered AFTER every multi-action def that starts with an
 * approve (swap-buy-eth, payer-repay-debt, octant-vault-deposit, lst-wsteth-wrap,
 * lst-lido-request-withdrawal, lst-meth-unstake-request, swap-uniswap-v3) so
 * those claim their 2-action sequences first.
 */

import { type Address, encodeAbiParameters, parseAbiParameters, parseUnits } from 'viem';
import { COMMON_TOKENS } from '../../actionTemplates/constants';
import {
  addressEquals,
  decodeArgs,
  formatTokenAmount,
  matchSignature,
  parseTokenSelectValue,
  stringifyTokenSelectValue,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  token: string;
  spender: string;
  amount: string;
}

const APPROVE_SIG = 'approve(address,uint256)';

export const erc20Approve: TransactionActionDef<Fields> = {
  id: 'erc20-approve',
  category: 'erc20',
  name: 'Approve ERC-20 Spender',
  description:
    'Authorize a contract to spend an ERC-20 token from the treasury (swap routers, vaults, bridges, etc.)',
  isMultiAction: false,
  fields: [
    {
      name: 'token',
      label: 'Token',
      type: 'treasury-token-select',
      required: true,
    },
    {
      name: 'spender',
      label: 'Spender',
      type: 'address',
      placeholder: '0x... (e.g. Uniswap Router)',
      required: true,
    },
    {
      name: 'amount',
      label: 'Amount',
      type: 'amount',
      required: true,
      validation: { min: 0 },
      helpText:
        'Use a large number for unlimited approval, or a specific amount for one-shot allowance',
    },
  ],

  encode(values) {
    const token = parseTokenSelectValue(values.token, COMMON_TOKENS);
    if (!token) throw new Error('erc20-approve: invalid token');
    const amount = parseUnits(values.amount || '0', token.decimals);
    return [
      {
        target: token.address,
        value: '0',
        signature: APPROVE_SIG,
        calldata: encodeAbiParameters(parseAbiParameters('address, uint256'), [
          values.spender as Address,
          amount,
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

    // Reject the "revoke" pattern (amount = 0) — that's erc20-revoke-approval.
    if (args[1] === BigInt(0)) return null;

    const tokenAddress = action.target as Address;
    const knownToken = COMMON_TOKENS.find((t) =>
      addressEquals(t.address, tokenAddress),
    );
    const decimals = knownToken?.decimals ?? 18;
    return {
      values: {
        token: stringifyTokenSelectValue({
          symbol: knownToken?.symbol ?? tokenAddress,
          address: tokenAddress,
          decimals,
          isNative: false,
        }),
        spender: args[0],
        amount: formatTokenAmount(args[1], decimals),
      },
      consumed: 1,
    };
  },

  describe(values) {
    const token = parseTokenSelectValue(values.token);
    const symbol = token?.symbol ?? 'tokens';
    return [
      {
        title: `Approve ${values.amount} ${symbol}`,
        description: `for ${values.spender} to spend`,
        functionName: 'approve',
        params: { spender: values.spender, amount: values.amount, token: symbol },
      },
    ];
  },
};
