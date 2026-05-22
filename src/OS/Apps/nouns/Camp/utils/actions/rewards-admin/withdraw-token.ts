/**
 * admin-rewards-withdraw-token — `withdrawToken(address, address, uint256)`.
 * (token, recipient, amount) sweep from the rewards contract.
 */

import { encodeAbiParameters, parseAbiParameters, parseUnits, type Address } from 'viem';
import { CLIENT_REWARDS_ADDRESS, COMMON_TOKENS } from '../../actionTemplates/constants';
import {
  decodeArgs,
  formatTokenAmount,
  matchSignature,
  matchTarget,
  parseTokenSelectValue,
  stringifyTokenSelectValue,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  /** JSON-stringified TokenSelectValue. */
  token: string;
  recipient: string;
  amount: string;
}

const SIG = 'withdrawToken(address,address,uint256)';
const TARGET = CLIENT_REWARDS_ADDRESS as Address;

export const adminRewardsWithdrawToken: TransactionActionDef<Fields> = {
  id: 'admin-rewards-withdraw-token',
  category: 'rewards-admin',
  name: 'Withdraw Token from Rewards',
  description: 'Sweep an ERC-20 balance out of the ClientRewards contract',
  isMultiAction: false,
  fields: [
    { name: 'token', label: 'Token', type: 'token-select', required: true },
    { name: 'recipient', label: 'Recipient', type: 'address', required: true },
    { name: 'amount', label: 'Amount', type: 'amount', required: true },
  ],

  encode(values) {
    const token = parseTokenSelectValue(values.token, COMMON_TOKENS);
    if (!token) throw new Error('admin-rewards-withdraw-token: invalid token');
    const amount = parseUnits(values.amount || '0', token.decimals);
    return [
      {
        target: TARGET,
        value: '0',
        signature: SIG,
        calldata: encodeAbiParameters(
          parseAbiParameters('address, address, uint256'),
          [token.address, values.recipient as Address, amount],
        ),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!matchTarget(action, TARGET)) return null;
    if (!matchSignature(action, SIG)) return null;
    const args = decodeArgs<readonly [Address, Address, bigint]>(
      action.calldata,
      'address, address, uint256',
    );
    if (!args) return null;
    const tokenAddress = args[0];
    const knownToken = COMMON_TOKENS.find(
      (t) => t.address.toLowerCase() === tokenAddress.toLowerCase(),
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
        recipient: args[1],
        amount: formatTokenAmount(args[2], decimals),
      },
      consumed: 1,
    };
  },

  describe(values) {
    const token = parseTokenSelectValue(values.token);
    const symbol = token?.symbol ?? 'tokens';
    return [
      {
        title: `Withdraw ${values.amount} ${symbol} from ClientRewards`,
        description: `to ${values.recipient}`,
        functionName: 'withdrawToken',
        params: { token: symbol, recipient: values.recipient, amount: values.amount },
      },
    ];
  },
};
