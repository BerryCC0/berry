/**
 * admin-fork-tokens — `_setErc20TokensToIncludeInFork(address[])`.
 * Takes a list of ERC-20 token addresses that go into fork escrow. The
 * user enters them as a comma-separated string; we normalise to a clean
 * Address[] before encoding.
 */

import { encodeAbiParameters, parseAbiParameters, type Address } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  decodeArgs,
  matchSignature,
  matchTarget,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  /** Comma-separated address list. */
  tokens: string;
}

const SIG = '_setErc20TokensToIncludeInFork(address[])';
const DAO_PROXY = NOUNS_ADDRESSES.governor as Address;

function parseTokenList(raw: string | undefined): Address[] {
  return (raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is Address => s.length === 42 && s.startsWith('0x'));
}

export const adminForkTokens: TransactionActionDef<Fields> = {
  id: 'admin-fork-tokens',
  category: 'governance-admin',
  name: 'Set Fork Tokens',
  description: 'ERC-20 tokens that are claimable from fork escrow',
  isMultiAction: false,
  fields: [
    {
      name: 'tokens',
      label: 'Token Addresses',
      type: 'text',
      placeholder: '0xtoken1, 0xtoken2, ...',
      helpText: 'Comma-separated list of ERC-20 addresses',
      required: true,
    },
  ],

  encode(values) {
    return [
      {
        target: DAO_PROXY,
        value: '0',
        signature: SIG,
        calldata: encodeAbiParameters(parseAbiParameters('address[]'), [
          parseTokenList(values.tokens),
        ]),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!matchTarget(action, DAO_PROXY)) return null;
    if (!matchSignature(action, SIG)) return null;
    const args = decodeArgs<readonly [readonly Address[]]>(
      action.calldata,
      'address[]',
    );
    if (!args) return null;
    return {
      values: { tokens: args[0].join(', ') },
      consumed: 1,
    };
  },

  describe(values) {
    const tokens = parseTokenList(values.tokens);
    return [
      {
        title: `Set ${tokens.length} fork token${tokens.length === 1 ? '' : 's'}`,
        functionName: '_setErc20TokensToIncludeInFork',
        params: { count: String(tokens.length) },
      },
    ];
  },
};
