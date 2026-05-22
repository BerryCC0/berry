/**
 * rewards-admin — ClientRewards contract admin setters.
 *
 * Mix of no-arg toggles (enable/disable), single-address setters, and a few
 * tuple-shape setters that get their own files (auction-params, proposal-params,
 * client-approval, withdraw-token).
 */

import { type Address } from 'viem';
import { CLIENT_REWARDS_ADDRESS } from '../../actionTemplates/constants';
import {
  makeAddressAction,
  makeNoArgAction,
} from '../shared/factories';

const TARGET = CLIENT_REWARDS_ADDRESS as Address;

export const adminRewardsEnableAuction = makeNoArgAction({
  id: 'admin-rewards-enable-auction',
  name: 'Enable Auction Rewards',
  description: 'Start paying client rewards on auction settlements',
  category: 'rewards-admin',
  target: TARGET,
  signature: 'enableAuctionRewards()',
});

export const adminRewardsDisableAuction = makeNoArgAction({
  id: 'admin-rewards-disable-auction',
  name: 'Disable Auction Rewards',
  description: 'Stop paying client rewards on auction settlements',
  category: 'rewards-admin',
  target: TARGET,
  signature: 'disableAuctionRewards()',
});

export const adminRewardsEnableProposal = makeNoArgAction({
  id: 'admin-rewards-enable-proposal',
  name: 'Enable Proposal Rewards',
  description: 'Start paying client rewards on proposal/voting events',
  category: 'rewards-admin',
  target: TARGET,
  signature: 'enableProposalRewards()',
});

export const adminRewardsDisableProposal = makeNoArgAction({
  id: 'admin-rewards-disable-proposal',
  name: 'Disable Proposal Rewards',
  description: 'Stop paying client rewards on proposal/voting events',
  category: 'rewards-admin',
  target: TARGET,
  signature: 'disableProposalRewards()',
});

export const adminRewardsAdmin = makeAddressAction({
  id: 'admin-rewards-admin',
  name: 'Set Rewards Admin',
  description: 'Operational admin for the ClientRewards contract',
  category: 'rewards-admin',
  target: TARGET,
  signature: 'setAdmin(address)',
  field: { name: 'address', label: 'Admin' },
});

export const adminRewardsDescriptor = makeAddressAction({
  id: 'admin-rewards-descriptor',
  name: 'Set Rewards Descriptor',
  description: 'Descriptor contract that resolves client metadata',
  category: 'rewards-admin',
  target: TARGET,
  signature: 'setDescriptor(address)',
  field: { name: 'address', label: 'Descriptor' },
});

export const adminRewardsEthToken = makeAddressAction({
  id: 'admin-rewards-eth-token',
  name: 'Set Rewards ETH Token',
  description: 'WETH-style ERC-20 the rewards contract pays out in',
  category: 'rewards-admin',
  target: TARGET,
  signature: 'setETHToken(address)',
  field: { name: 'address', label: 'ETH Token' },
});

export const adminRewardsTransferOwnership = makeAddressAction({
  id: 'admin-rewards-transfer-ownership',
  name: 'Transfer Rewards Ownership',
  description: 'Move ownership of the ClientRewards contract',
  category: 'rewards-admin',
  target: TARGET,
  signature: 'transferOwnership(address)',
  field: { name: 'address', label: 'New Owner' },
});

export { adminRewardsAuctionParams } from './auction-params';
export { adminRewardsProposalParams } from './proposal-params';
export { adminRewardsClientApproval } from './client-approval';
export { adminRewardsWithdrawToken } from './withdraw-token';
