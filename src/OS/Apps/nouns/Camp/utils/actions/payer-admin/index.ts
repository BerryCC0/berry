/**
 * payer-admin — Payer contract maintenance actions.
 */

import { type Address } from 'viem';
import { PAYER_ADDRESS } from '../../actionTemplates/constants';
import {
  makeAddressAction,
  makeNoArgAction,
} from '../shared/factories';

const TARGET = PAYER_ADDRESS as Address;

export const adminPayerWithdrawUsdc = makeNoArgAction({
  id: 'admin-payer-withdraw-usdc',
  name: 'Withdraw USDC from Payer',
  description: 'Sweep any held USDC out of the Payer contract',
  category: 'tokenbuyer-admin',
  target: TARGET,
  signature: 'withdrawPaymentToken()',
});

export const adminPayerTransferOwnership = makeAddressAction({
  id: 'admin-payer-transfer-ownership',
  name: 'Transfer Payer Ownership',
  description: 'Move ownership of the Payer contract',
  category: 'tokenbuyer-admin',
  target: TARGET,
  signature: 'transferOwnership(address)',
  field: { name: 'address', label: 'New Owner' },
});
