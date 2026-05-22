/**
 * treasury-delegate — delegate the voting power of any ERC20Votes token the
 * treasury holds (ENS, COMP, UNI, ARB, …). One on-chain action:
 *   target = token contract, signature = delegate(address).
 *
 * Excludes the Nouns token itself — that's `noun-delegate`, which owns its
 * own action def. The Nouns-specific def is registered first so it wins on
 * the NOUNS_TOKEN target before falling through to this generic matcher.
 */

import { type Address, encodeAbiParameters, parseAbiParameters } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import { KNOWN_VOTES_TOKENS } from '../../actionTemplates/constants';
import {
  addressEquals,
  decodeArgs,
  matchSignature,
  parseTokenSelectValue,
  stringifyTokenSelectValue,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  /** JSON-stringified TokenSelectValue. */
  token: string;
  /** Address that receives the treasury's voting power. */
  delegatee: string;
}

const DELEGATE_SIG = 'delegate(address)';

export const treasuryDelegate: TransactionActionDef<Fields> = {
  id: 'treasury-delegate',
  category: 'treasury',
  name: 'Delegate Voting Power',
  description:
    'Delegate the voting power of an ERC20Votes token held by the treasury (e.g. ENS, COMP, UNI)',
  isMultiAction: false,
  fields: [
    {
      name: 'token',
      label: 'Token',
      type: 'treasury-votes-token-select',
      required: true,
    },
    {
      name: 'delegatee',
      label: 'Delegate To',
      type: 'address',
      placeholder: '0x... or name.eth',
      required: true,
      helpText:
        "Address that will receive the treasury's voting power for this token",
    },
  ],

  encode(values) {
    const token = parseTokenSelectValue(values.token);
    if (!token) throw new Error('treasury-delegate: invalid token field');
    return [
      {
        target: token.address,
        value: '0',
        signature: DELEGATE_SIG,
        calldata: encodeAbiParameters(parseAbiParameters('address'), [
          values.delegatee as Address,
        ]),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!matchSignature(action, DELEGATE_SIG)) return null;
    // Don't claim Nouns-token delegations — that's `noun-delegate`.
    if (addressEquals(action.target, NOUNS_ADDRESSES.token)) return null;

    const args = decodeArgs<readonly [Address]>(action.calldata, 'address');
    if (!args) return null;

    const target = action.target as Address;
    const known = KNOWN_VOTES_TOKENS[target.toLowerCase()];
    return {
      values: {
        token: stringifyTokenSelectValue({
          symbol:
            known?.symbol ?? `${target.slice(0, 6)}…${target.slice(-4)}`,
          address: target,
          decimals: known?.decimals ?? 18,
          isNative: false,
        }),
        delegatee: args[0],
      },
      consumed: 1,
    };
  },

  describe(values) {
    const token = parseTokenSelectValue(values.token);
    const symbol = token?.symbol ?? 'tokens';
    return [
      {
        title: `Delegate ${symbol} voting power`,
        description: `to ${values.delegatee}`,
        functionName: 'delegate',
        params: { delegatee: values.delegatee, token: symbol },
      },
    ];
  },
};
