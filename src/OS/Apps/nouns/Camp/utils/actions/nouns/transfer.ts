/**
 * noun-transfer — send a Noun from the treasury to a recipient. One on-chain
 * action: `safeTransferFrom(treasury, recipient, nounId)` on the Nouns token.
 *
 * Matched only when the `from` argument is the treasury — user → user
 * transfers are not proposals (they don't go through the DAO) and shouldn't
 * be claimed here.
 */

import { type Address, encodeAbiParameters, parseAbiParameters } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  addressEquals,
  decodeArgs,
  matchSignature,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  recipient: string;
  nounId: string;
}

const SAFE_TRANSFER_FROM_SIG = 'safeTransferFrom(address,address,uint256)';

export const nounTransfer: TransactionActionDef<Fields> = {
  id: 'noun-transfer',
  category: 'nouns',
  name: 'Transfer a Noun',
  description: 'Send a Noun from the treasury to a recipient',
  isMultiAction: false,
  fields: [
    {
      name: 'recipient',
      label: 'Recipient',
      type: 'address',
      placeholder: '0x... or name.eth',
      required: true,
    },
    {
      name: 'nounId',
      label: 'Noun ID',
      type: 'number',
      placeholder: '123',
      required: true,
      validation: { min: 0 },
    },
  ],

  encode(values) {
    return [
      {
        target: NOUNS_ADDRESSES.token as Address,
        value: '0',
        signature: SAFE_TRANSFER_FROM_SIG,
        calldata: encodeAbiParameters(
          parseAbiParameters('address, address, uint256'),
          [
            NOUNS_ADDRESSES.treasury as Address,
            values.recipient as Address,
            BigInt(values.nounId || '0'),
          ],
        ),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!addressEquals(action.target, NOUNS_ADDRESSES.token)) return null;
    if (!matchSignature(action, SAFE_TRANSFER_FROM_SIG)) return null;

    const args = decodeArgs<readonly [Address, Address, bigint]>(
      action.calldata,
      'address, address, uint256',
    );
    if (!args) return null;
    // Only treasury → user; user → user belongs to noun-swap's first leg.
    if (!addressEquals(args[0], NOUNS_ADDRESSES.treasury)) return null;

    return {
      values: { recipient: args[1], nounId: args[2].toString() },
      consumed: 1,
    };
  },

  describe(values) {
    return [
      {
        title: `Send Noun #${values.nounId}`,
        description: `to ${values.recipient}`,
        functionName: 'safeTransferFrom',
        params: { recipient: values.recipient, nounId: values.nounId },
      },
    ];
  },
};
