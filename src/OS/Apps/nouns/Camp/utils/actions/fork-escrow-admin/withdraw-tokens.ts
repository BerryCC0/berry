/**
 * admin-fork-escrow-withdraw-tokens — withdraw Nouns from the fork escrow
 * via the GOVERNOR'S admin-gated wrappers (NOT by calling the ForkEscrow
 * contract directly — that's gated `onlyDAO` where `dao` == Governor proxy,
 * not the timelock, so the proposal would revert).
 *
 * Two underlying Governor functions (defined in NounsDAOFork.sol library,
 * called via delegatecall from the Governor proxy):
 *
 *   function withdrawDAONounsFromEscrowToTreasury(uint256[] tokenIds) external {
 *       withdrawDAONounsFromEscrow(ds, tokenIds, address(ds.timelock));
 *   }
 *
 *   function withdrawDAONounsFromEscrowIncreasingTotalSupply(
 *       uint256[] tokenIds, address to
 *   ) external {
 *       if (to == address(ds.timelock)) revert UseAlternativeWithdrawFunction();
 *       withdrawDAONounsFromEscrow(ds, tokenIds, to);
 *       emit DAONounsSupplyIncreasedFromEscrow(tokenIds.length, to);
 *   }
 *
 *   function withdrawDAONounsFromEscrow(... uint256[] tokenIds, address to) private {
 *       if (msg.sender != ds.admin) revert AdminOnly();      // msg.sender == timelock ✓
 *       ds.forkEscrow.withdrawTokens(tokenIds, to);          // Governor calls ForkEscrow ✓
 *   }
 *
 * The action def encodes whichever signature matches the chosen recipient.
 *
 * Precondition the proposer must understand: the Nouns must already be
 * DAO-owned inside the ForkEscrow contract — which only happens after a
 * successful fork has been executed (executeFork → closeEscrow runs
 * automatically). The DAO has no separate way to close the escrow itself.
 */

import { encodeAbiParameters, parseAbiParameters, type Address } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  addressEquals,
  decodeArgs,
  matchSignature,
  matchTarget,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  /** Comma-separated Noun IDs. */
  tokenIds: string;
  /** Destination address. Treasury → uses the "to-treasury" wrapper.
   *  Anything else → uses the "increasing-total-supply" wrapper. */
  recipient: string;
}

const TARGET = NOUNS_ADDRESSES.governor as Address;
const TREASURY = NOUNS_ADDRESSES.treasury as Address;

const SIG_TO_TREASURY = 'withdrawDAONounsFromEscrowToTreasury(uint256[])';
const SIG_INCREASE_SUPPLY =
  'withdrawDAONounsFromEscrowIncreasingTotalSupply(uint256[],address)';

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
  name: 'Withdraw DAO-Owned Escrowed Nouns',
  description:
    'Withdraw fork-escrowed Nouns that became DAO-owned (after a fork was executed). Calls the Governor — which is the only authorized caller of the ForkEscrow.',
  isMultiAction: false,
  fields: [
    {
      name: 'tokenIds',
      label: 'Noun IDs (comma-separated)',
      type: 'text',
      required: true,
      helpText:
        'Must be DAO-owned in the escrow (i.e., escrow has already been closed via executeFork — proposals cannot close it directly)',
    },
    {
      name: 'recipient',
      label: 'Recipient',
      type: 'address',
      required: true,
      helpText:
        'Treasury → cheaper path. Any other address → uses the supply-increasing wrapper.',
    },
  ],

  encode(values) {
    const tokenIds = parseTokenIds(values.tokenIds);
    const recipient = (values.recipient || TREASURY) as Address;

    if (addressEquals(recipient, TREASURY)) {
      // Treasury path — cheaper, semantically "return to DAO treasury".
      return [
        {
          target: TARGET,
          value: '0',
          signature: SIG_TO_TREASURY,
          calldata: encodeAbiParameters(parseAbiParameters('uint256[]'), [
            tokenIds,
          ]),
        },
      ];
    }

    // Non-treasury path — emits DAONounsSupplyIncreasedFromEscrow so the
    // accounting is explicit. The Governor reverts if `to == timelock`,
    // which is why we route the treasury case to the other function above.
    return [
      {
        target: TARGET,
        value: '0',
        signature: SIG_INCREASE_SUPPLY,
        calldata: encodeAbiParameters(
          parseAbiParameters('uint256[], address'),
          [tokenIds, recipient],
        ),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!matchTarget(action, TARGET)) return null;

    if (matchSignature(action, SIG_TO_TREASURY)) {
      const args = decodeArgs<readonly [readonly bigint[]]>(
        action.calldata,
        'uint256[]',
      );
      if (!args) return null;
      return {
        values: {
          tokenIds: args[0].map((b) => b.toString()).join(', '),
          recipient: TREASURY,
        },
        consumed: 1,
      };
    }

    if (matchSignature(action, SIG_INCREASE_SUPPLY)) {
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
    }

    return null;
  },

  describe(values) {
    const ids = parseTokenIds(values.tokenIds);
    const toTreasury = addressEquals(values.recipient, TREASURY);
    return [
      {
        title: `Withdraw ${ids.length} Noun${ids.length === 1 ? '' : 's'} from fork escrow`,
        description: toTreasury
          ? 'to Nouns Treasury'
          : `to ${values.recipient}`,
        functionName: toTreasury
          ? 'withdrawDAONounsFromEscrowToTreasury'
          : 'withdrawDAONounsFromEscrowIncreasingTotalSupply',
        params: { count: String(ids.length), recipient: values.recipient },
      },
    ];
  },
};
