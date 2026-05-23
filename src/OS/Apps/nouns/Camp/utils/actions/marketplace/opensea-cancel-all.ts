/**
 * opensea-cancel-all — `Seaport.incrementCounter()`.
 *
 * Bulk-invalidates every order the offerer (the treasury) currently has
 * open on OpenSea Seaport. Cheaper and faster than enumerating + cancelling
 * orders one at a time; useful as an emergency button.
 *
 * From the Seaport source:
 *
 *   function incrementCounter() external returns (uint256 newCounter) {
 *       newCounter = ++_counters[msg.sender];
 *       ...
 *   }
 *
 * The treasury is `msg.sender` from a proposal context, so this is safe to
 * call from any proposal — no auth gating beyond "the offerer is who they
 * say they are."
 */

import { type Address } from 'viem';
import { matchSignature, matchTarget } from '../shared';
import type { TransactionActionDef } from '../types';
import { SEAPORT_1_6 } from './_seaport';

const SIG = 'incrementCounter()';
const TARGET = SEAPORT_1_6 as Address;

export const openseaCancelAll: TransactionActionDef<Record<string, never>> = {
  id: 'opensea-cancel-all',
  category: 'marketplace',
  name: 'Cancel All OpenSea Orders',
  description:
    'Bulk-invalidate every open OpenSea order the treasury has authorised. Cheap, irreversible, useful as a kill-switch.',
  isMultiAction: false,
  fields: [],

  encode() {
    return [{ target: TARGET, value: '0', signature: SIG, calldata: '0x' }];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!matchTarget(action, TARGET)) return null;
    if (!matchSignature(action, SIG)) return null;
    if (action.calldata && action.calldata !== '0x') return null;
    return { values: {}, consumed: 1 };
  },

  describe() {
    return [
      {
        title: 'Cancel all OpenSea orders',
        description: 'Increments the Seaport counter — invalidates every open order',
        functionName: 'incrementCounter',
      },
    ];
  },
};
