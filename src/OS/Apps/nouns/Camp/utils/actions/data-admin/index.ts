/**
 * data-admin — Nouns DAO Data (proposal candidates) Proxy admin setters.
 */

import { type Address } from 'viem';
import { DATA_PROXY_ADDRESS } from '../../actionTemplates/constants';
import {
  makeAddressAction,
  makeUintAction,
} from '../shared/factories';
import { adminDataWithdrawEth } from './withdraw-eth';

const TARGET = DATA_PROXY_ADDRESS as Address;

export const adminDataCreateCost = makeUintAction({
  id: 'admin-data-create-cost',
  name: 'Set Candidate Create Cost',
  description: 'ETH cost to create a non-voter proposal candidate',
  category: 'governance-admin',
  target: TARGET,
  signature: 'setCreateCandidateCost(uint256)',
  field: { name: 'amount', label: 'Amount (ETH)' },
  width: 'uint256',
  decimals: 18,
});

export const adminDataUpdateCost = makeUintAction({
  id: 'admin-data-update-cost',
  name: 'Set Candidate Update Cost',
  description: 'ETH cost to update a non-voter proposal candidate',
  category: 'governance-admin',
  target: TARGET,
  signature: 'setUpdateCandidateCost(uint256)',
  field: { name: 'amount', label: 'Amount (ETH)' },
  width: 'uint256',
  decimals: 18,
});

export const adminDataFeeRecipient = makeAddressAction({
  id: 'admin-data-fee-recipient',
  name: 'Set Data Fee Recipient',
  description: 'Address that receives candidate creation/update fees',
  category: 'governance-admin',
  target: TARGET,
  signature: 'setFeeRecipient(address)',
  field: { name: 'address', label: 'Recipient' },
});

export const adminDataDunaAdmin = makeAddressAction({
  id: 'admin-data-duna-admin',
  name: 'Set DUNA Admin',
  description: 'Address authorised to post DUNA compliance signals',
  category: 'governance-admin',
  target: TARGET,
  signature: 'setDunaAdmin(address)',
  field: { name: 'address', label: 'DUNA Admin' },
});

export { adminDataWithdrawEth };
