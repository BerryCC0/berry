/**
 * admin-fork-escrow-return-tokens — `returnTokensToOwner(address, uint256[])`.
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
  owner: string;
  /** Comma-separated Noun IDs. */
  tokenIds: string;
}

const SIG = 'returnTokensToOwner(address,uint256[])';
const TARGET = FORK_ESCROW_ADDRESS as Address;

function parseTokenIds(raw: string | undefined): bigint[] {
  return (raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => BigInt(s));
}

export const adminForkEscrowReturnTokens: TransactionActionDef<Fields> = {
  id: 'admin-fork-escrow-return-tokens',
  category: 'governance-admin',
  name: 'Return Escrowed Nouns',
  description: 'Return escrowed Nouns to their original owner',
  isMultiAction: false,
  fields: [
    { name: 'owner', label: 'Original Owner', type: 'address', required: true },
    { name: 'tokenIds', label: 'Noun IDs (comma-separated)', type: 'text', required: true },
  ],

  encode(values) {
    return [
      {
        target: TARGET,
        value: '0',
        signature: SIG,
        calldata: encodeAbiParameters(parseAbiParameters('address, uint256[]'), [
          values.owner as Address,
          parseTokenIds(values.tokenIds),
        ]),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!matchTarget(action, TARGET)) return null;
    if (!matchSignature(action, SIG)) return null;
    const args = decodeArgs<readonly [Address, readonly bigint[]]>(
      action.calldata,
      'address, uint256[]',
    );
    if (!args) return null;
    return {
      values: {
        owner: args[0],
        tokenIds: args[1].map((b) => b.toString()).join(', '),
      },
      consumed: 1,
    };
  },

  describe(values) {
    const ids = parseTokenIds(values.tokenIds);
    return [
      {
        title: `Return ${ids.length} Noun${ids.length === 1 ? '' : 's'} to ${values.owner}`,
        functionName: 'returnTokensToOwner',
        params: { count: String(ids.length), owner: values.owner },
      },
    ];
  },
};
