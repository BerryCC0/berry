/**
 * lil-noun-delegate — delegate the voting power of Lil Nouns held by the
 * treasury. Same on-chain shape as `noun-delegate` (single `delegate(address)`
 * call) but on the LilNouns token contract.
 *
 * Why this is V1-centric: the Nouns V1 treasury (legacy timelock at
 * `0x0BC3807Ec262cB779b38D65b38158acC3bfedE10`) holds the bulk of the
 * Lil Nouns collection (~800+ tokens). The V2 treasury could in principle
 * also delegate any Lil Nouns it picks up — the action def doesn't care
 * which timelock executes it, but the proposal MUST be created with
 * `Proposal Type: Timelock V1` for the V1 treasury's Lil Nouns to actually
 * be the ones delegated (since the call originates from the executor).
 *
 * MUST be registered before `treasury-delegate` so the generic ERC20Votes
 * matcher doesn't claim it — Lil Nouns are an ERC721, not ERC20Votes, but
 * the calldata shape (`delegate(address)`) is identical and the generic
 * decoder doesn't introspect token-standard.
 */

import { type Address, encodeAbiParameters, parseAbiParameters } from 'viem';
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

/**
 * LilNouns ERC-721 token contract. Single source of truth — also referenced
 * by `app/lib/nft-allowlist.ts` for the marketplace editor's allowlist.
 */
export const LIL_NOUNS_TOKEN =
  '0x4b10701Bfd7BFEdc47d50562b76b436fbB5BdB3B' as Address;

export const lilNounDelegate: TransactionActionDef<Fields> = {
  id: 'lil-noun-delegate',
  category: 'nouns',
  name: "Delegate Treasury's Lil Noun Votes",
  description:
    "Delegate the voting power of treasury-held Lil Nouns to another address. The V1 treasury holds the bulk of the collection — for those, set Proposal Type to Timelock V1 so the call originates from the V1 executor.",
  isMultiAction: false,
  fields: [
    {
      name: 'delegatee',
      label: 'Delegate To',
      type: 'address',
      placeholder: '0x... or name.eth',
      required: true,
      helpText:
        "Address that will receive the treasury's voting power on LilNounsDAO governance",
    },
  ],

  encode(values) {
    return [
      {
        target: LIL_NOUNS_TOKEN,
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
    if (!addressEquals(action.target, LIL_NOUNS_TOKEN)) return null;
    if (!matchSignature(action, DELEGATE_SIG)) return null;

    const args = decodeArgs<readonly [Address]>(action, 'address');
    if (!args) return null;
    return { values: { delegatee: args[0] }, consumed: 1 };
  },

  describe(values) {
    return [
      {
        title: `Delegate Lil Noun votes to ${values.delegatee}`,
        description: "Sets the treasury's Lil Nouns delegate for LilNounsDAO governance",
        functionName: 'delegate',
        params: { delegatee: values.delegatee },
      },
    ];
  },
};
