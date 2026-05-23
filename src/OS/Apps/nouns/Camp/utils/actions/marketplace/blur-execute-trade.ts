/**
 * blur-execute-trade — pre-built Blur order calldata passthrough.
 *
 * Blur's marketplace protocol uses EOA-signed orders heavily and doesn't
 * expose a clean on-chain validation path for contract bidders. The one
 * flow that's straightforward for a DAO proposal is **buying** an existing
 * Blur listing: the caller (treasury) executes a sell/buy match where the
 * buy side carries the treasury's intent.
 *
 * Rather than reconstruct Blur's order tuples (separate format from
 * Seaport, no widely-adopted contract SDK), this template accepts
 * pre-built target + value + calldata. The proposer builds it via the
 * Blur API or SDK off-chain, just like the existing marketplace-fulfill-seaport
 * template.
 *
 * Blur is reachable at its Exchange contract:
 *
 *   0x000000000000Ad05Ccc4F10045630fb830B95127 (BlurExchangeV2)
 *
 * but proposers should confirm this matches the URL Blur's UI / API hands
 * them — Blur has updated its exchange contract before.
 */

import type { Address, Hex } from 'viem';
import type { TransactionActionDef } from '../types';

interface Fields {
  /** Blur Exchange address — usually pre-filled but overridable. */
  to: string;
  /** ETH value in wei (Blur trades that buy with ETH carry value here). */
  value: string;
  /** Full Blur order calldata (selector + arguments). */
  calldata: string;
}

/** BlurExchangeV2 mainnet deployment — see comment above. */
const BLUR_EXCHANGE_V2 = '0x000000000000Ad05Ccc4F10045630fb830B95127';

export const blurExecuteTrade: TransactionActionDef<Fields> = {
  id: 'blur-execute-trade',
  category: 'marketplace',
  name: 'Buy on Blur (pre-built calldata)',
  description:
    "Execute a pre-built Blur trade. Power-user template — paste the calldata Blur's API hands you.",
  isMultiAction: false,
  fields: [
    {
      name: 'to',
      label: 'Blur Exchange Address',
      type: 'address',
      required: true,
      placeholder: BLUR_EXCHANGE_V2,
      helpText:
        'Defaults to BlurExchangeV2. Override only if Blur has migrated.',
    },
    {
      name: 'value',
      label: 'ETH Value (wei)',
      type: 'text',
      required: true,
    },
    {
      name: 'calldata',
      label: 'Pre-built Calldata',
      type: 'text',
      required: true,
      helpText:
        "Hex string from the Blur API. Includes selector + arguments — we don't repackage.",
    },
  ],

  encode(values) {
    return [
      {
        target: (values.to || BLUR_EXCHANGE_V2) as Address,
        value: values.value || '0',
        signature: '',
        calldata: (values.calldata || '0x') as Hex,
      },
    ];
  },

  // Blur's calldata uses Blur-specific selectors that we don't decode here.
  // Returning null means "let the legacy custom decoder handle this" — the
  // decoded transaction won't be claimed as a `blur-execute-trade` template
  // when re-loaded from on-chain, but the calldata still works.
  decode() {
    return null;
  },

  describe() {
    return [];
  },
};
