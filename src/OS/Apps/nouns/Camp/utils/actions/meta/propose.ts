/**
 * meta-propose — a proposal that creates another proposal when executed.
 * Calls `propose(address[], uint256[], string[], bytes[], string, uint32)` on
 * the DAO Governor with the inner proposal's parameters. BERRY_CLIENT_ID is
 * baked in so Berry OS earns its client reward when the meta-proposal lands.
 */

import {
  type Address,
  type Hex,
  encodeAbiParameters,
  parseAbiParameters,
} from 'viem';
import { BERRY_CLIENT_ID, NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  decodeArgs,
  matchSignature,
  matchTarget,
} from '../shared';
import type { ProposalAction, TransactionActionDef } from '../types';

interface Fields {
  innerTitle: string;
  innerDescription: string;
  /** JSON-stringified ProposalAction[]. */
  innerAction: string;
}

const SIG = 'propose(address[],uint256[],string[],bytes[],string,uint32)';
const DAO_PROXY = NOUNS_ADDRESSES.governor as Address;

function parseInnerActions(raw: string | undefined): ProposalAction[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ProposalAction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const metaPropose: TransactionActionDef<Fields> = {
  id: 'meta-propose',
  category: 'meta',
  name: 'Create Meta-Proposal',
  description: 'A proposal that submits another proposal on execution',
  isMultiAction: false,
  fields: [
    { name: 'innerTitle', label: 'Inner Proposal Title', type: 'text', required: true },
    { name: 'innerDescription', label: 'Inner Description', type: 'text', required: true },
    {
      name: 'innerAction',
      label: 'Inner Actions (JSON)',
      type: 'text',
      required: true,
      helpText: 'Serialised ProposalAction[] from the nested template editor',
    },
  ],

  encode(values) {
    const innerActions = parseInnerActions(values.innerAction);
    const fallback: ProposalAction = {
      target: '0x0000000000000000000000000000000000000000',
      value: '0',
      signature: '',
      calldata: '0x',
    };
    const safeActions = innerActions.length > 0 ? innerActions : [fallback];

    const innerTargets = safeActions.map((a) => (a.target || fallback.target) as Address);
    const innerValues = safeActions.map((a) => BigInt(a.value || '0'));
    const innerSignatures = safeActions.map((a) => a.signature || '');
    const innerCalldatas = safeActions.map((a) => (a.calldata || '0x') as Hex);
    const innerFullDescription = `# ${values.innerTitle || ''}\n\n${values.innerDescription || ''}`;

    return [
      {
        target: DAO_PROXY,
        value: '0',
        signature: SIG,
        calldata: encodeAbiParameters(
          parseAbiParameters(
            'address[], uint256[], string[], bytes[], string, uint32',
          ),
          [
            innerTargets,
            innerValues,
            innerSignatures,
            innerCalldatas,
            innerFullDescription,
            BERRY_CLIENT_ID,
          ],
        ),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!matchTarget(action, DAO_PROXY)) return null;
    if (!matchSignature(action, SIG)) return null;

    const args = decodeArgs<
      readonly [
        readonly Address[],
        readonly bigint[],
        readonly string[],
        readonly Hex[],
        string,
        number,
      ]
    >(
      action.calldata,
      'address[], uint256[], string[], bytes[], string, uint32',
    );
    if (!args) return null;
    const [targets, values, signatures, calldatas, fullDesc] = args;

    // Split the markdown back into title/description on the first blank line
    // following the `# title` heading.
    const titleMatch = fullDesc.match(/^#\s*([^\n]*)\n\n([\s\S]*)$/);
    const innerTitle = titleMatch?.[1] ?? '';
    const innerDescription = titleMatch?.[2] ?? fullDesc;

    const innerActions: ProposalAction[] = targets.map((t, i) => ({
      target: t,
      value: values[i].toString(),
      signature: signatures[i],
      calldata: calldatas[i],
    }));

    return {
      values: {
        innerTitle,
        innerDescription,
        innerAction: JSON.stringify(innerActions),
      },
      consumed: 1,
    };
  },

  describe(values) {
    return [
      {
        title: `Meta-proposal: "${values.innerTitle}"`,
        description: 'Submits a nested proposal on execution',
        functionName: 'propose',
        params: { innerTitle: values.innerTitle },
      },
    ];
  },
};
