/**
 * noun-swap — user swaps a Noun with the treasury, optionally adding a tip.
 *
 * 2-3 on-chain actions:
 *   1. transferFrom(user, treasury, userNounId)   — user's Noun → treasury
 *   2. (optional) tip: transferFrom(user, treasury, tipAmount) on WETH/USDC,
 *                      OR direct ETH transfer to TREASURY
 *   3. safeTransferFrom(treasury, user, treasuryNounId) — treasury's Noun → user
 *
 * The user must pre-approve both the Nouns token and the tip token (if any)
 * for the treasury — those approvals happen outside the proposal flow.
 *
 * Must be registered before noun-transfer in the registry — `noun-transfer`
 * decodes any treasury→user safeTransferFrom in isolation, which would
 * claim the third leg of a swap. The 3-action matcher must run first.
 */

import {
  type Address,
  encodeAbiParameters,
  parseAbiParameters,
  parseEther,
  parseUnits,
} from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import { EXTERNAL_CONTRACTS } from '../../actionTemplates/constants';
import {
  addressEquals,
  decodeArgs,
  formatTokenAmount,
  matchSignature,
  matchTarget,
  multiActionId,
} from '../shared';
import type { ActionDescription, ProposalAction, TransactionActionDef } from '../types';

interface Fields {
  userAddress: string;
  userNounId: string;
  treasuryNounId: string;
  /** 'eth' | 'weth' | 'usdc' | undefined (no tip). */
  tipCurrency?: string;
  /** Tip amount in display units; '0' or missing = no tip. */
  tipAmount?: string;
}

const TRANSFER_FROM_SIG = 'transferFrom(address,address,uint256)';
const SAFE_TRANSFER_FROM_SIG = 'safeTransferFrom(address,address,uint256)';
const NOUNS_TOKEN = NOUNS_ADDRESSES.token as Address;
const TREASURY = NOUNS_ADDRESSES.treasury as Address;

export const nounSwap: TransactionActionDef<Fields> = {
  id: 'noun-swap',
  category: 'nouns',
  name: 'Swap a Noun',
  description: "Trade Nouns with the treasury, optionally tipping in ETH/WETH/USDC",
  isMultiAction: true,
  fields: [
    { name: 'userAddress', label: 'Your Address', type: 'address', required: true },
    { name: 'userNounId', label: 'Your Noun ID', type: 'number', required: true },
    { name: 'treasuryNounId', label: "Treasury's Noun ID", type: 'number', required: true },
    {
      name: 'tipCurrency',
      label: 'Tip Currency',
      type: 'select',
      options: [
        { label: 'None', value: '' },
        { label: 'ETH', value: 'eth' },
        { label: 'WETH', value: 'weth' },
        { label: 'USDC', value: 'usdc' },
      ],
    },
    { name: 'tipAmount', label: 'Tip Amount', type: 'amount' },
  ],

  encode(values) {
    const groupId = multiActionId('noun-swap', values);
    const actions: ProposalAction[] = [];
    const user = values.userAddress as Address;

    // Leg 1: user's Noun → treasury
    actions.push({
      target: NOUNS_TOKEN,
      value: '0',
      signature: TRANSFER_FROM_SIG,
      calldata: encodeAbiParameters(
        parseAbiParameters('address, address, uint256'),
        [user, TREASURY, BigInt(values.userNounId || '0')],
      ),
      isPartOfMultiAction: true,
      multiActionGroupId: groupId,
      multiActionIndex: 0,
    });

    // Leg 2 (optional): tip
    const tipAmount = values.tipAmount;
    const tipCurrency = values.tipCurrency;
    if (tipAmount && parseFloat(tipAmount) > 0) {
      if (tipCurrency === 'eth') {
        actions.push({
          target: TREASURY,
          value: parseEther(tipAmount).toString(),
          signature: '',
          calldata: '0x',
          isPartOfMultiAction: true,
          multiActionGroupId: groupId,
          multiActionIndex: actions.length,
        });
      } else if (tipCurrency === 'weth') {
        actions.push({
          target: EXTERNAL_CONTRACTS.WETH.address,
          value: '0',
          signature: TRANSFER_FROM_SIG,
          calldata: encodeAbiParameters(
            parseAbiParameters('address, address, uint256'),
            [user, TREASURY, parseEther(tipAmount)],
          ),
          isPartOfMultiAction: true,
          multiActionGroupId: groupId,
          multiActionIndex: actions.length,
        });
      } else if (tipCurrency === 'usdc') {
        actions.push({
          target: EXTERNAL_CONTRACTS.USDC.address,
          value: '0',
          signature: TRANSFER_FROM_SIG,
          calldata: encodeAbiParameters(
            parseAbiParameters('address, address, uint256'),
            [user, TREASURY, parseUnits(tipAmount, 6)],
          ),
          isPartOfMultiAction: true,
          multiActionGroupId: groupId,
          multiActionIndex: actions.length,
        });
      }
    }

    // Leg 3: treasury's Noun → user
    actions.push({
      target: NOUNS_TOKEN,
      value: '0',
      signature: SAFE_TRANSFER_FROM_SIG,
      calldata: encodeAbiParameters(
        parseAbiParameters('address, address, uint256'),
        [TREASURY, user, BigInt(values.treasuryNounId || '0')],
      ),
      isPartOfMultiAction: true,
      multiActionGroupId: groupId,
      multiActionIndex: actions.length,
    });

    return actions;
  },

  decode(actions, cursor) {
    const first = actions[cursor];
    if (!first) return null;
    if (!matchTarget(first, NOUNS_TOKEN)) return null;
    if (!matchSignature(first, TRANSFER_FROM_SIG)) return null;

    const args1 = decodeArgs<readonly [Address, Address, bigint]>(
      first.calldata,
      'address, address, uint256',
    );
    if (!args1) return null;
    const userAddress = args1[0];
    if (!addressEquals(args1[1], TREASURY)) return null;
    const userNounId = args1[2];

    // Scan forward for the matching treasury → user safeTransferFrom and an
    // optional tip in between.
    let tipCurrency: string | undefined;
    let tipAmount: string | undefined;
    let treasuryNounId: bigint | undefined;
    let consumed = 1;

    for (let i = cursor + 1; i < actions.length; i++) {
      const a = actions[i];

      // Tip leg variants
      if (matchSignature(a, TRANSFER_FROM_SIG)) {
        if (matchTarget(a, EXTERNAL_CONTRACTS.WETH.address)) {
          const tArgs = decodeArgs<readonly [Address, Address, bigint]>(
            a.calldata,
            'address, address, uint256',
          );
          if (tArgs && addressEquals(tArgs[0], userAddress) && addressEquals(tArgs[1], TREASURY)) {
            tipCurrency = 'weth';
            tipAmount = formatTokenAmount(tArgs[2], 18);
            consumed = i - cursor + 1;
            continue;
          }
        } else if (matchTarget(a, EXTERNAL_CONTRACTS.USDC.address)) {
          const tArgs = decodeArgs<readonly [Address, Address, bigint]>(
            a.calldata,
            'address, address, uint256',
          );
          if (tArgs && addressEquals(tArgs[0], userAddress) && addressEquals(tArgs[1], TREASURY)) {
            tipCurrency = 'usdc';
            tipAmount = formatTokenAmount(tArgs[2], 6);
            consumed = i - cursor + 1;
            continue;
          }
        }
      }

      // ETH tip variant: direct value send to treasury
      if (!a.signature && (!a.calldata || a.calldata === '0x') && a.value !== '0' && matchTarget(a, TREASURY)) {
        tipCurrency = 'eth';
        tipAmount = formatTokenAmount(BigInt(a.value), 18);
        consumed = i - cursor + 1;
        continue;
      }

      // Closing leg: treasury → user safeTransferFrom
      if (matchTarget(a, NOUNS_TOKEN) && matchSignature(a, SAFE_TRANSFER_FROM_SIG)) {
        const cArgs = decodeArgs<readonly [Address, Address, bigint]>(
          a.calldata,
          'address, address, uint256',
        );
        if (cArgs && addressEquals(cArgs[0], TREASURY) && addressEquals(cArgs[1], userAddress)) {
          treasuryNounId = cArgs[2];
          consumed = i - cursor + 1;
          break;
        }
      }

      // Anything else interrupts the swap match.
      return null;
    }

    if (treasuryNounId === undefined) return null;

    return {
      values: {
        userAddress,
        userNounId: userNounId.toString(),
        treasuryNounId: treasuryNounId.toString(),
        tipCurrency,
        tipAmount,
      },
      consumed,
    };
  },

  describe(values) {
    const descriptions: ActionDescription[] = [
      {
        title: `Pull Noun #${values.userNounId} from ${values.userAddress}`,
        functionName: 'transferFrom',
      },
    ];
    if (values.tipAmount && parseFloat(values.tipAmount) > 0) {
      const currency = (values.tipCurrency || 'weth').toUpperCase();
      descriptions.push({
        title: `Collect ${values.tipAmount} ${currency} tip`,
        functionName: values.tipCurrency === 'eth' ? 'transfer' : 'transferFrom',
      });
    }
    descriptions.push({
      title: `Send Noun #${values.treasuryNounId} to ${values.userAddress}`,
      functionName: 'safeTransferFrom',
    });
    return descriptions;
  },
};
