/**
 * admin-fork-escrow-withdraw-tokens — `withdrawTokens(uint256[], address)`.
 */

import { encodeAbiParameters, parseAbiParameters, type Address } from 'viem';
import { FORK_ESCROW_ADDRESS } from '../../actionTemplates/constants';
import {
  decodeArgs,
  matchSignature,
  matchTarget,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  /** Comma-separated Noun IDs. */
  tokenIds: string;
  recipient: string;
}

const SIG = 'withdrawTokens(uint256[],address)';
const TARGET = FORK_ESCROW_ADDRESS as Address;

function parseTokenIds(raw: string | undefined): bigint[] {
  return (raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => BigInt(s));
}

export const adminForkEscrowWithdrawTokens: TransactionActionDef<Fields> = {
  id: 'admin-fork-escrow-withdraw-tokens',
  category: 'governance-admin',
  name: 'Withdraw Escrowed Nouns',
  description: 'Withdraw specific Nouns from fork escrow to a recipient',
  isMultiAction: false,
  fields: [
    { name: 'tokenIds', label: 'Noun IDs (comma-separated)', type: 'text', required: true },
    { name: 'recipient', label: 'Recipient', type: 'address', required: true },
  ],

  encode(values) {
    return [
      {
        target: TARGET,
        value: '0',
        signature: SIG,
        calldata: encodeAbiParameters(parseAbiParameters('uint256[], address'), [
          parseTokenIds(values.tokenIds),
          values.recipient as Address,
        ]),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!matchTarget(action, TARGET)) return null;
    if (!matchSignature(action, SIG)) return null;
    const args = decodeArgs<readonly [readonly bigint[], Address]>(
      action.calldata,
      'uint256[], address',
    );
    if (!args) return null;
    return {
      values: {
        tokenIds: args[0].map((b) => b.toString()).join(', '),
        recipient: args[1],
      },
      consumed: 1,
    };
  },

  describe(values) {
    const ids = parseTokenIds(values.tokenIds);
    return [
      {
        title: `Withdraw ${ids.length} Noun${ids.length === 1 ? '' : 's'} from fork escrow`,
        description: `to ${values.recipient}`,
        functionName: 'withdrawTokens',
        params: { count: String(ids.length), recipient: values.recipient },
      },
    ];
  },
};
