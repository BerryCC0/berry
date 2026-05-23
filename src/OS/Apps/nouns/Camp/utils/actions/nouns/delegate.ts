/**
 * noun-delegate — delegate the treasury's Nouns voting power to another
 * address. One on-chain action: `delegate(delegatee)` on the Nouns token.
 *
 * MUST be registered before `treasury-delegate` so the Nouns-specific case
 * wins on the NOUNS_TOKEN target.
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
  delegatee: string;
}

const DELEGATE_SIG = 'delegate(address)';

export const nounDelegate: TransactionActionDef<Fields> = {
  id: 'noun-delegate',
  category: 'nouns',
  name: "Delegate Treasury's Noun Votes",
  description: 'Delegate the voting power of treasury-held Nouns to another address',
  isMultiAction: false,
  fields: [
    {
      name: 'delegatee',
      label: 'Delegate To',
      type: 'address',
      placeholder: '0x... or name.eth',
      required: true,
    },
  ],

  encode(values) {
    return [
      {
        target: NOUNS_ADDRESSES.token as Address,
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
    if (!addressEquals(action.target, NOUNS_ADDRESSES.token)) return null;
    if (!matchSignature(action, DELEGATE_SIG)) return null;

    const args = decodeArgs<readonly [Address]>(action, 'address');
    if (!args) return null;
    return { values: { delegatee: args[0] }, consumed: 1 };
  },

  describe(values) {
    return [
      {
        title: `Delegate Noun votes to ${values.delegatee}`,
        functionName: 'delegate',
        params: { delegatee: values.delegatee },
      },
    ];
  },
};
