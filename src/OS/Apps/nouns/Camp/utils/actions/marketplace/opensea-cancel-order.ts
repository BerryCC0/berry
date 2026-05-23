/**
 * opensea-cancel-order — `Seaport.cancel(OrderComponents[])`.
 *
 * Cancels specific Seaport orders. The caller must be the `offerer` of each
 * order being cancelled (which is the treasury for any order we proposed).
 *
 * The action's `orders` field stores a JSON-stringified `OrderComponents[]`
 * (typically produced by the editor or by the OpenSea API for orders the
 * treasury has active). Each entry includes `counter` (not
 * `totalOriginalConsiderationItems`) — that's the Seaport convention for
 * cancellation.
 */

import { type Address } from 'viem';
import { decodeArgs, matchSignature, matchTarget } from '../shared';
import type { TransactionActionDef } from '../types';
import {
  type OrderComponents,
  SEAPORT_1_6,
  decodeCancelCalldata,
  encodeCancelCalldata,
  parseOrderComponentsJson,
  stringifyOrderComponents,
} from './_seaport';

interface Fields {
  /**
   * JSON-stringified `OrderComponents[]`. The editor accepts pasted JSON
   * from the OpenSea API or constructed in-app; ensures round-trip is
   * byte-identical between encode and decode.
   */
  orders: string;
}

const SIG = 'cancel(((address,address,(uint8,address,uint256,uint256,uint256)[],(uint8,address,uint256,uint256,uint256,address)[],uint8,uint256,uint256,bytes32,uint256,bytes32,uint256)[]))';
// Note: the actual Solidity signature is `cancel(OrderComponents[])` —
// keccak256 of the full struct-expanded form yields the selector. The
// short form below is what's stored on `action.signature` (Nouns DAO
// proposals execute via `signature || ''` so we use the canonical
// human-readable form here).
const HUMAN_SIG = 'cancel(OrderComponents[])';
void SIG;

const TARGET = SEAPORT_1_6 as Address;

function parseOrders(raw: string | undefined): OrderComponents[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) =>
      parseOrderComponentsJson(JSON.stringify(entry)),
    );
  } catch {
    return [];
  }
}

function stringifyOrders(orders: OrderComponents[]): string {
  return JSON.stringify(
    orders.map((o) => JSON.parse(stringifyOrderComponents(o))),
  );
}

export const openseaCancelOrder: TransactionActionDef<Fields> = {
  id: 'opensea-cancel-order',
  category: 'marketplace',
  name: 'Cancel Specific OpenSea Order',
  description:
    'Cancel one or more specific Seaport orders. Surgical alternative to cancel-all.',
  isMultiAction: false,
  fields: [
    {
      name: 'orders',
      label: 'Orders to cancel (JSON)',
      type: 'text',
      required: true,
      helpText:
        'JSON array of OrderComponents. Each must include `counter` (not totalOriginalConsiderationItems) — Seaport convention for cancellation.',
    },
  ],

  encode(values) {
    const orders = parseOrders(values.orders);
    return [
      {
        target: TARGET,
        value: '0',
        signature: HUMAN_SIG,
        calldata: encodeCancelCalldata(orders),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!matchTarget(action, TARGET)) return null;
    if (!matchSignature(action, HUMAN_SIG)) return null;
    const decoded = decodeCancelCalldata(action.calldata);
    if (!decoded) return null;
    return {
      values: { orders: stringifyOrders(decoded) },
      consumed: 1,
    };
    void decodeArgs;
  },

  describe(values) {
    const count = parseOrders(values.orders).length;
    return [
      {
        title: `Cancel ${count} OpenSea order${count === 1 ? '' : 's'}`,
        functionName: 'cancel',
        params: { count: String(count) },
      },
    ];
  },
};
