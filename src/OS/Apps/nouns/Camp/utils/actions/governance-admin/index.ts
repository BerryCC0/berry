/**
 * governance-admin — DAO Proxy admin setters. Most are single-arg
 * `_setX(value)` calls; built via factories. Tuple/array shapes get
 * dedicated files (see dynamic-quorum.ts, fork-tokens.ts).
 */

import { type Address } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  makeAddressAction,
  makeUintAction,
} from '../shared/factories';

const DAO_PROXY = NOUNS_ADDRESSES.governor as Address;
const TREASURY = NOUNS_ADDRESSES.treasury as Address;

// ----- Voting / proposal parameters -----------------------------------------

export const adminVotingDelay = makeUintAction({
  id: 'admin-voting-delay',
  name: 'Set Voting Delay',
  description:
    'Number of blocks between proposal creation and the start of voting',
  category: 'governance-admin',
  target: DAO_PROXY,
  signature: '_setVotingDelay(uint256)',
  field: { name: 'blocks', label: 'Blocks' },
  width: 'uint256',
});

export const adminVotingPeriod = makeUintAction({
  id: 'admin-voting-period',
  name: 'Set Voting Period',
  description: 'Number of blocks a proposal is open for voting',
  category: 'governance-admin',
  target: DAO_PROXY,
  signature: '_setVotingPeriod(uint256)',
  field: { name: 'blocks', label: 'Blocks' },
  width: 'uint256',
});

export const adminProposalThreshold = makeUintAction({
  id: 'admin-proposal-threshold',
  name: 'Set Proposal Threshold (BPS)',
  description:
    'Minimum voting power (in basis points of total supply) to submit a proposal',
  category: 'governance-admin',
  target: DAO_PROXY,
  signature: '_setProposalThresholdBPS(uint256)',
  field: { name: 'bps', label: 'BPS' },
  width: 'uint256',
});

export const adminLastMinuteWindow = makeUintAction({
  id: 'admin-last-minute-window',
  name: 'Set Last-Minute Window',
  description: 'Block window at end of voting that triggers the objection period',
  category: 'governance-admin',
  target: DAO_PROXY,
  signature: '_setLastMinuteWindowInBlocks(uint32)',
  field: { name: 'blocks', label: 'Blocks' },
  width: 'uint32',
});

export const adminObjectionPeriod = makeUintAction({
  id: 'admin-objection-period',
  name: 'Set Objection Period',
  description: 'Duration of the objection period in blocks',
  category: 'governance-admin',
  target: DAO_PROXY,
  signature: '_setObjectionPeriodDurationInBlocks(uint32)',
  field: { name: 'blocks', label: 'Blocks' },
  width: 'uint32',
});

export const adminUpdatablePeriod = makeUintAction({
  id: 'admin-updatable-period',
  name: 'Set Updatable Period',
  description:
    'Blocks during which a proposal can still be edited after creation',
  category: 'governance-admin',
  target: DAO_PROXY,
  signature: '_setProposalUpdatablePeriodInBlocks(uint32)',
  field: { name: 'blocks', label: 'Blocks' },
  width: 'uint32',
});

// ----- Quorum parameters ----------------------------------------------------

export const adminMinQuorum = makeUintAction({
  id: 'admin-min-quorum',
  name: 'Set Min Quorum (BPS)',
  description: 'Minimum quorum threshold floor (basis points)',
  category: 'governance-admin',
  target: DAO_PROXY,
  signature: '_setMinQuorumVotesBPS(uint16)',
  field: { name: 'bps', label: 'BPS' },
  width: 'uint16',
});

export const adminMaxQuorum = makeUintAction({
  id: 'admin-max-quorum',
  name: 'Set Max Quorum (BPS)',
  description: 'Maximum quorum threshold ceiling (basis points)',
  category: 'governance-admin',
  target: DAO_PROXY,
  signature: '_setMaxQuorumVotesBPS(uint16)',
  field: { name: 'bps', label: 'BPS' },
  width: 'uint16',
});

export const adminQuorumCoefficient = makeUintAction({
  id: 'admin-quorum-coefficient',
  name: 'Set Quorum Coefficient',
  description: 'Slope coefficient that scales quorum with against-votes',
  category: 'governance-admin',
  target: DAO_PROXY,
  signature: '_setQuorumCoefficient(uint32)',
  field: { name: 'coefficient', label: 'Coefficient' },
  width: 'uint32',
});

// ----- Fork parameters ------------------------------------------------------

export const adminForkPeriod = makeUintAction({
  id: 'admin-fork-period',
  name: 'Set Fork Period',
  description: 'Duration (in seconds) holders have to join a fork after threshold',
  category: 'governance-admin',
  target: DAO_PROXY,
  signature: '_setForkPeriod(uint256)',
  field: { name: 'seconds', label: 'Seconds' },
  width: 'uint256',
});

export const adminForkThreshold = makeUintAction({
  id: 'admin-fork-threshold',
  name: 'Set Fork Threshold (BPS)',
  description: 'Voting power (basis points) required to trigger a fork',
  category: 'governance-admin',
  target: DAO_PROXY,
  signature: '_setForkThresholdBPS(uint256)',
  field: { name: 'bps', label: 'BPS' },
  width: 'uint256',
});

export const adminForkDeployer = makeAddressAction({
  id: 'admin-fork-deployer',
  name: 'Set Fork DAO Deployer',
  description: 'Contract responsible for deploying forked DAOs',
  category: 'governance-admin',
  target: DAO_PROXY,
  signature: '_setForkDAODeployer(address)',
  field: { name: 'address', label: 'Deployer' },
});

export const adminForkEscrow = makeAddressAction({
  id: 'admin-fork-escrow',
  name: 'Set Fork Escrow',
  description: 'Contract that holds escrowed Nouns during a fork',
  category: 'governance-admin',
  target: DAO_PROXY,
  signature: '_setForkEscrow(address)',
  field: { name: 'address', label: 'Escrow' },
});

export const adminPendingAdmin = makeAddressAction({
  id: 'admin-pending-admin',
  name: 'Set Pending Admin (Governor)',
  description:
    'Two-step admin handover for the Governor — recipient must call acceptAdmin()',
  category: 'governance-admin',
  target: DAO_PROXY,
  signature: '_setPendingAdmin(address)',
  field: { name: 'address', label: 'New Admin' },
});

// ----- Timelock (treasury) admin --------------------------------------------
// These target the TREASURY, not the DAO_PROXY. Kept here because they're
// part of the same governance-admin user-mental-model.

export const adminTimelockDelay = makeUintAction({
  id: 'admin-timelock-delay',
  name: 'Set Timelock Delay',
  description: 'Delay (seconds) between proposal queue and execution',
  category: 'governance-admin',
  target: TREASURY,
  signature: '_setDelay(uint256)',
  field: { name: 'seconds', label: 'Seconds' },
  width: 'uint256',
});

export const adminTimelockAdmin = makeAddressAction({
  id: 'admin-timelock-admin',
  name: 'Set Pending Admin (Timelock)',
  description: 'Two-step admin handover for the Treasury timelock',
  category: 'governance-admin',
  target: TREASURY,
  signature: '_setPendingAdmin(address)',
  field: { name: 'address', label: 'New Admin' },
});

// ----- Special shapes (own files) -------------------------------------------

export { adminDynamicQuorum } from './dynamic-quorum';
export { adminForkTokens } from './fork-tokens';
