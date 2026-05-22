/**
 * admin-rewards-proposal-params — 5-field struct setter.
 * `setProposalRewardParams((uint32, uint8, uint16, uint16, uint16))`.
 */

import { encodeAbiParameters, parseAbiParameters, type Address } from 'viem';
import { CLIENT_REWARDS_ADDRESS } from '../../actionTemplates/constants';
import {
  decodeArgs,
  matchSignature,
  matchTarget,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  minimumRewardPeriod: string;
  numProposalsEnoughForReward: string;
  proposalRewardBps: string;
  votingRewardBps: string;
  proposalEligibilityQuorumBps: string;
}

const SIG = 'setProposalRewardParams((uint32,uint8,uint16,uint16,uint16))';
const TARGET = CLIENT_REWARDS_ADDRESS as Address;

export const adminRewardsProposalParams: TransactionActionDef<Fields> = {
  id: 'admin-rewards-proposal-params',
  category: 'rewards-admin',
  name: 'Set Proposal Reward Params',
  description: 'Reward rates and eligibility thresholds for proposal-based rewards',
  isMultiAction: false,
  fields: [
    { name: 'minimumRewardPeriod', label: 'Min reward period (seconds)', type: 'number', required: true },
    { name: 'numProposalsEnoughForReward', label: 'Proposals enough for reward', type: 'number', required: true },
    { name: 'proposalRewardBps', label: 'Proposal reward (BPS)', type: 'number', required: true },
    { name: 'votingRewardBps', label: 'Voting reward (BPS)', type: 'number', required: true },
    { name: 'proposalEligibilityQuorumBps', label: 'Eligibility quorum (BPS)', type: 'number', required: true },
  ],

  encode(values) {
    return [
      {
        target: TARGET,
        value: '0',
        signature: SIG,
        calldata: encodeAbiParameters(
          parseAbiParameters('(uint32, uint8, uint16, uint16, uint16)'),
          [
            [
              Number(values.minimumRewardPeriod || '0'),
              Number(values.numProposalsEnoughForReward || '0'),
              Number(values.proposalRewardBps || '0'),
              Number(values.votingRewardBps || '0'),
              Number(values.proposalEligibilityQuorumBps || '0'),
            ],
          ],
        ),
      },
    ];
  },

  decode(actions, cursor) {
    const action = actions[cursor];
    if (!action) return null;
    if (!matchTarget(action, TARGET)) return null;
    if (!matchSignature(action, SIG)) return null;
    const args = decodeArgs<readonly [readonly [number, number, number, number, number]]>(
      action.calldata,
      '(uint32, uint8, uint16, uint16, uint16)',
    );
    if (!args) return null;
    const tuple = args[0];
    return {
      values: {
        minimumRewardPeriod: tuple[0].toString(),
        numProposalsEnoughForReward: tuple[1].toString(),
        proposalRewardBps: tuple[2].toString(),
        votingRewardBps: tuple[3].toString(),
        proposalEligibilityQuorumBps: tuple[4].toString(),
      },
      consumed: 1,
    };
  },

  describe(values) {
    return [
      {
        title: `Proposal rewards: ${values.proposalRewardBps} BPS proposal, ${values.votingRewardBps} BPS voting`,
        functionName: 'setProposalRewardParams',
        params: { ...values },
      },
    ];
  },
};
