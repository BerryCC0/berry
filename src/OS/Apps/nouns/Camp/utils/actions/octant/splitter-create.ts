/**
 * octant-splitter-create — `createPaymentSplitter(payees, names, shares)` on
 * the Octant PaymentSplitterFactory. Deploys a minimal-proxy splitter that
 * forwards incoming funds to payees according to their share.
 *
 * The free-form payee text field is parsed into the (address, name, shares)
 * tuple the factory expects. Format per line:
 *   "0xAddr [optional name with spaces] <integer shares>"
 */

import { encodeAbiParameters, parseAbiParameters, type Address } from 'viem';
import { OCTANT_PAYMENT_SPLITTER_FACTORY_ADDRESS } from '../../actionTemplates/constants';
import {
  decodeArgs,
  matchSignature,
  matchTarget,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  payees: string;
}

const SIG = 'createPaymentSplitter(address[],string[],uint256[])';
const TARGET = OCTANT_PAYMENT_SPLITTER_FACTORY_ADDRESS as Address;

interface ParsedPayees {
  payees: Address[];
  names: string[];
  shares: bigint[];
}

function parsePayees(raw: string | undefined): ParsedPayees | null {
  if (!raw) return null;
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return null;

  const payees: Address[] = [];
  const names: string[] = [];
  const shares: bigint[] = [];

  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length < 2) return null;
    const addr = parts[0];
    const sharesStr = parts[parts.length - 1];
    const name = parts.slice(1, -1).join(' ');
    if (!addr.startsWith('0x') || addr.length !== 42) return null;
    if (!/^\d+$/.test(sharesStr)) return null;
    payees.push(addr as Address);
    names.push(name);
    shares.push(BigInt(sharesStr));
  }
  return { payees, names, shares };
}

function stringifyPayees(p: ParsedPayees): string {
  return p.payees
    .map((addr, i) => {
      const name = (p.names[i] || '').trim();
      const share = p.shares[i].toString();
      return name ? `${addr} ${name} ${share}` : `${addr} ${share}`;
    })
    .join('\n');
}

export const octantSplitterCreate: TransactionActionDef<Fields> = {
  id: 'octant-splitter-create',
  category: 'octant',
  name: 'Create Octant Payment Splitter',
  description: 'Deploy a PaymentSplitter that forwards funds to payees by share',
  isMultiAction: false,
  fields: [
    {
      name: 'payees',
      label: 'Payees',
      type: 'text',
      required: true,
      helpText:
        'One per line: "0xAddr [optional name] <integer shares>"',
    },
  ],

  encode(values) {
    const parsed = parsePayees(values.payees);
    if (!parsed) {
      // Malformed input — return a no-op so generator-level validation can
      // surface the error rather than crashing.
      return [{ target: TARGET, value: '0', signature: '', calldata: '0x' }];
    }
    return [
      {
        target: TARGET,
        value: '0',
        signature: SIG,
        calldata: encodeAbiParameters(
          parseAbiParameters('address[], string[], uint256[]'),
          [parsed.payees, parsed.names, parsed.shares],
        ),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!matchTarget(action, TARGET)) return null;
    if (!matchSignature(action, SIG)) return null;

    const args = decodeArgs<
      readonly [readonly Address[], readonly string[], readonly bigint[]]
    >(action.calldata, 'address[], string[], uint256[]');
    if (!args) return null;

    return {
      values: {
        payees: stringifyPayees({
          payees: args[0] as Address[],
          names: args[1] as string[],
          shares: args[2] as bigint[],
        }),
      },
      consumed: 1,
    };
  },

  describe(values) {
    const parsed = parsePayees(values.payees);
    const count = parsed?.payees.length ?? 0;
    return [
      {
        title: `Deploy PaymentSplitter (${count} payee${count === 1 ? '' : 's'})`,
        functionName: 'createPaymentSplitter',
        params: { payeeCount: String(count) },
      },
    ];
  },
};
